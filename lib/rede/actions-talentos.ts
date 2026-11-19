"use server";

import { listMembers } from "@/lib/equipe/members-service";
import { actionFail, actionOk, actionOkWith, type ActionResult, type ActionResultWith } from "@/types/action-result";

import { atualizar, executar, lojaVisivel } from "./acao-base";
import { lerEntrada, uuid } from "./acao-comum";
import { exigirEdicao, getRedeContexto, type RedeContexto } from "./acesso";
import { hojeDoTenant } from "./loader";
import { erroRh } from "./rh";
import {
  cargoCriterioSchema,
  criterioCargoSchema,
  liderancaSchema,
  nineBoxSchema,
  type CargoCriterioEntrada,
  type CriterioCargoEntrada,
  type LiderancaEntrada,
  type NineBoxEntrada,
} from "./schemas-talentos";
import { lerNotasNineBox, type ItemHistoricoNineBox } from "./talentos";

/** Roda a ação traduzindo as restrições do banco para frases claras (as mensagens dos gatilhos já vêm em português). */
function rodar<T extends ActionResult | ActionResultWith<Record<string, unknown>>>(padrao: string, fn: () => Promise<T>) {
  return executar(padrao, async () => {
    try {
      return await fn();
    } catch (e) {
      const msg = erroRh(e);
      if (msg) throw new Error(msg);
      throw e;
    }
  });
}

type LinhaColab = { id: string; loja_id: string; nome: string; cargo: string; status: string };

/** O colaborador precisa existir na empresa e na loja informada (o banco também confere com a chave composta). */
async function lerColaboradorDaLoja(ctx: RedeContexto, id: string, lojaId: string): Promise<LinhaColab> {
  const { data, error } = await ctx.db.from("rede_rh_colaboradores").select("id,loja_id,nome,cargo,status").eq("id", id).eq("tenant_id", ctx.tenant.id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Colaborador não encontrado ou sem permissão.");
  const c = data as LinhaColab;
  if (c.loja_id !== lojaId) throw new Error("Este colaborador não é desta loja.");
  return c;
}

/* ------------------------------------------------------------------ Nine Box */

/**
 * Grava (ou corrige) a avaliação de desempenho e potencial de um colaborador ativo. A sucessão e as contagens por
 * quadrante são calculadas a partir desta nota quando a tela abre — não há nada a "sincronizar".
 */
export async function salvarNineBoxAction(slug: string, entrada: NineBoxEntrada): Promise<ActionResultWith<{ criado: boolean }>> {
  return rodar("Não foi possível salvar a avaliação do Nine Box.", async () => {
    const ctx = await exigirEdicao(slug, "nine_box");
    const n = lerEntrada(nineBoxSchema, entrada);
    await lojaVisivel(ctx, n.lojaId);
    const c = await lerColaboradorDaLoja(ctx, n.colaboradorId, n.lojaId);
    if (c.status !== "ativo") throw new Error("Só colaborador ativo pode ser avaliado no Nine Box.");

    const { data: atual, error: e0 } = await ctx.db.from("rede_rh_ninebox").select("id").eq("colaborador_id", n.colaboradorId).eq("tenant_id", ctx.tenant.id).maybeSingle();
    if (e0) throw e0;
    if (atual) {
      // A origem (exemplo/manual) não muda numa correção: dado de demonstração continua identificado como exemplo.
      const { data, error } = await ctx.db
        .from("rede_rh_ninebox")
        .update({ desempenho: n.desempenho, potencial: n.potencial, observacoes: n.observacoes })
        .eq("id", (atual as { id: string }).id)
        .eq("tenant_id", ctx.tenant.id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Avaliação não encontrada ou sem permissão.");
      atualizar(slug);
      return actionOkWith({ criado: false }, (atual as { id: string }).id);
    }
    const { data, error } = await ctx.db
      .from("rede_rh_ninebox")
      .insert({ tenant_id: ctx.tenant.id, loja_id: n.lojaId, colaborador_id: n.colaboradorId, desempenho: n.desempenho, potencial: n.potencial, observacoes: n.observacoes, origem: "manual" })
      .select("id")
      .single();
    if (error) throw error;
    atualizar(slug);
    return actionOkWith({ criado: true }, (data as { id: string }).id);
  });
}

/** Tira a avaliação: a pessoa volta a "sem avaliação" (nunca vira "médio"). A remoção fica no histórico. */
export async function limparNineBoxAction(slug: string, colaboradorId: string): Promise<ActionResult> {
  return rodar("Não foi possível remover a avaliação.", async () => {
    const ctx = await exigirEdicao(slug, "nine_box");
    const id = lerEntrada(uuid, colaboradorId);
    const { data, error } = await ctx.db.from("rede_rh_ninebox").delete().eq("colaborador_id", id).eq("tenant_id", ctx.tenant.id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Este colaborador não tem avaliação, ou você não tem permissão.");
    atualizar(slug);
    return actionOk();
  });
}

/** Só administrador e consultor leem o histórico (o banco também barra os demais). Mais recente primeiro, até 100 alterações. */
export async function historicoNineBoxAction(slug: string, lojaId?: string | null): Promise<ActionResultWith<{ itens: ItemHistoricoNineBox[] }>> {
  return rodar("Não foi possível carregar o histórico.", async () => {
    const ctx = await getRedeContexto(slug);
    if (ctx.perfil?.papel !== "administrador" && ctx.perfil?.papel !== "consultor") return actionFail("Seu perfil não tem acesso ao histórico de alterações.");
    const loja = lojaId ? lerEntrada(uuid, lojaId) : null;
    let q = ctx.db.from("rede_historico").select("id,acao,antes,depois,user_id,created_at").eq("tenant_id", ctx.tenant.id).eq("entidade", "rede_rh_ninebox");
    if (loja) q = q.eq("loja_id", loja);
    const { data, error } = await q.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(100);
    if (error) throw error;
    const membros = await listMembers(ctx.tenant.id);
    const nomes = new Map(membros.map((m) => [m.userId, m.profile.fullName ?? m.profile.email ?? "Usuário"] as const));
    const itens: ItemHistoricoNineBox[] = ((data ?? []) as Record<string, unknown>[]).map((h) => {
      const acao = h.acao === "insert" || h.acao === "delete" ? h.acao : "update";
      const antes = h.antes as Record<string, unknown> | null;
      const depois = h.depois as Record<string, unknown> | null;
      const colab = (depois ?? antes)?.colaborador_id;
      return {
        id: String(h.id),
        quando: String(h.created_at),
        acao,
        usuario: typeof h.user_id === "string" ? (nomes.get(h.user_id) ?? "Usuário") : "Sistema",
        colaboradorId: typeof colab === "string" ? colab : null,
        antes: lerNotasNineBox(antes),
        depois: lerNotasNineBox(depois),
      };
    });
    return actionOkWith({ itens });
  });
}

/* ------------------------------------------------------------------ liderança do gerente (nota mensal 0–5) */

/**
 * Nota de liderança do gerente no mês. É a única parte do score do gerente que é lançada à mão; o resto vem de
 * vendas, indicadores, qualidade e RH. Mês que já tem nota é substituído (e a resposta avisa).
 */
export async function salvarLiderancaAction(slug: string, entrada: LiderancaEntrada): Promise<ActionResultWith<{ substituido: boolean }>> {
  return rodar("Não foi possível salvar a nota de liderança.", async () => {
    const ctx = await exigirEdicao(slug, "avaliacao_gerentes");
    const l = lerEntrada(liderancaSchema, entrada);
    if (l.mes > hojeDoTenant().slice(0, 7)) throw new Error("O mês da avaliação não pode ser futuro.");
    await lojaVisivel(ctx, l.lojaId);
    const c = await lerColaboradorDaLoja(ctx, l.colaboradorId, l.lojaId);
    if (c.cargo !== "gerente_loja") throw new Error("A nota de liderança é só para gerente de loja.");
    const mes = `${l.mes}-01`;

    const { data: atual, error: e0 } = await ctx.db.from("rede_rh_lideranca").select("id").eq("colaborador_id", l.colaboradorId).eq("mes", mes).eq("tenant_id", ctx.tenant.id).maybeSingle();
    if (e0) throw e0;
    if (atual) {
      const { data, error } = await ctx.db
        .from("rede_rh_lideranca")
        .update({ nota: l.nota, observacoes: l.observacoes })
        .eq("id", (atual as { id: string }).id)
        .eq("tenant_id", ctx.tenant.id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Nota não encontrada ou sem permissão.");
      atualizar(slug);
      return actionOkWith({ substituido: true }, (atual as { id: string }).id);
    }
    const { data, error } = await ctx.db
      .from("rede_rh_lideranca")
      .insert({ tenant_id: ctx.tenant.id, loja_id: l.lojaId, colaborador_id: l.colaboradorId, mes, nota: l.nota, observacoes: l.observacoes, origem: "manual" })
      .select("id")
      .single();
    if (error) throw error;
    atualizar(slug);
    return actionOkWith({ substituido: false }, (data as { id: string }).id);
  });
}

/** Remove a nota do mês: o critério "Liderança" deixa de contar e o peso dele é redistribuído (nunca vira zero). */
export async function excluirLiderancaAction(slug: string, id: string): Promise<ActionResult> {
  return rodar("Não foi possível excluir a nota de liderança.", async () => {
    const ctx = await exigirEdicao(slug, "avaliacao_gerentes");
    const rid = lerEntrada(uuid, id);
    const { data, error } = await ctx.db.from("rede_rh_lideranca").delete().eq("id", rid).eq("tenant_id", ctx.tenant.id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Nota não encontrada ou sem permissão.");
    atualizar(slug);
    return actionOk();
  });
}

/* ------------------------------------------------------------------ critérios por cargo (sucessão e carreira) */

/** Ajusta o critério e o tempo mínimo de um cargo para esta empresa (vale para todas as lojas). */
export async function salvarCriterioAction(slug: string, entrada: CriterioCargoEntrada): Promise<ActionResult> {
  return rodar("Não foi possível salvar o critério.", async () => {
    const ctx = await exigirEdicao(slug, "sucessao");
    const c = lerEntrada(criterioCargoSchema, entrada);
    const { error } = await ctx.db
      .from("rede_rh_criterios_cargo")
      .upsert({ tenant_id: ctx.tenant.id, cargo: c.cargo, tempo_minimo_meses: c.tempoMinimoMeses, criterio: c.criterio, origem: "manual" }, { onConflict: "tenant_id,cargo" });
    if (error) throw error;
    atualizar(slug);
    return actionOk();
  });
}

/** Volta o cargo ao critério padrão do painel original. */
export async function restaurarCriterioAction(slug: string, entrada: CargoCriterioEntrada): Promise<ActionResult> {
  return rodar("Não foi possível restaurar o critério.", async () => {
    const ctx = await exigirEdicao(slug, "sucessao");
    const c = lerEntrada(cargoCriterioSchema, entrada);
    const { error } = await ctx.db.from("rede_rh_criterios_cargo").delete().eq("tenant_id", ctx.tenant.id).eq("cargo", c.cargo);
    if (error) throw error;
    atualizar(slug);
    return actionOk();
  });
}
