"use server";

import { listMembers } from "@/lib/equipe/members-service";
import { actionFail, actionOk, actionOkWith, type ActionResult, type ActionResultWith } from "@/types/action-result";

import { atualizar, executar, lojaVisivel } from "./acao-base";
import { lerEntrada, uuid } from "./acao-comum";
import { exigirEdicao, getRedeContexto } from "./acesso";
import { avaliarRegistro, planosSugeridos, rotuloOrigemDelivery } from "./delivery";
import { carregarBase, hojeDoTenant } from "./loader";
import { mapRegistroDelivery } from "./mapeadores-cozinha";
import { COLUNAS_PLANO, mapPlano } from "./mapeadores-qualidade";
import { descreverAlteracao, estaAberto, planoDuplicado, prazoValido, rotuloStatusPlano, type ItemHistoricoPlano, type ResultadoGerarPlanos } from "./planos";
import { planoEdicaoSchema, planoNovoSchema, type PlanoEdicaoEntrada, type PlanoNovoEntrada } from "./schemas-qualidade";

const MSG_DUPLICADO = "Já existe um plano em aberto nesta loja com a mesma descrição. Atualize aquele plano em vez de criar outro.";
const PAPEIS_QUE_VERIFICAM = ["administrador", "consultor", "gerente_regional"];

const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

async function planosAbertosDaLoja(ctx: Awaited<ReturnType<typeof exigirEdicao>>, lojaId: string) {
  const { data, error } = await ctx.db.from("rede_planos_acao").select("id,loja_id,descricao,status").eq("loja_id", lojaId).in("status", ["pendente", "em_andamento"]).limit(2000);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapPlano);
}

/* ------------------------------------------------------------------ plano lançado à mão */

export async function criarPlanoAction(slug: string, entrada: PlanoNovoEntrada): Promise<ActionResult> {
  return executar("Não foi possível criar o plano de ação.", async () => {
    const ctx = await exigirEdicao(slug, "planos_acao");
    const p = lerEntrada(planoNovoSchema, entrada);
    const hoje = hojeDoTenant();
    const loja = await lojaVisivel(ctx, p.lojaId);
    if (loja.status === "inativa") throw new Error("A loja está inativa.");
    if (p.status === "em_andamento" && !p.acao) throw new Error("Informe a ação corretiva antes de iniciar o plano.");
    if (!prazoValido(p.prazo, hoje)) throw new Error("O prazo não pode estar no passado.");
    if (planoDuplicado(await planosAbertosDaLoja(ctx, p.lojaId), { lojaId: p.lojaId, descricao: p.descricao })) throw new Error(MSG_DUPLICADO);

    const { error } = await ctx.db.from("rede_planos_acao").insert({
      tenant_id: ctx.tenant.id,
      loja_id: p.lojaId,
      origem_tipo: p.origemTipo,
      origem_rotulo: p.origemRotulo ?? (p.origemTipo === "indicador" ? "Indicador fora da meta" : "Lançado à mão"),
      descricao: p.descricao,
      acao: p.acao,
      responsavel: p.responsavel,
      prazo: p.prazo,
      prioridade: p.prioridade,
      status: p.status,
      observacoes: p.observacoes,
    });
    if (error) throw error;
    atualizar(slug);
    return actionOk();
  });
}

/* ------------------------------------------------------------------ andamento do plano */

export async function atualizarPlanoAction(slug: string, id: string, entrada: PlanoEdicaoEntrada): Promise<ActionResult> {
  return executar("Não foi possível salvar o plano de ação.", async () => {
    const ctx = await exigirEdicao(slug, "planos_acao");
    const pid = lerEntrada(uuid, id);
    const e = lerEntrada(planoEdicaoSchema, entrada);
    const hoje = hojeDoTenant();

    const { data: linha, error: erroLeitura } = await ctx.db.from("rede_planos_acao").select(COLUNAS_PLANO).eq("id", pid).eq("tenant_id", ctx.tenant.id).maybeSingle();
    if (erroLeitura) throw erroLeitura;
    if (!linha) throw new Error("Plano não encontrado ou sem permissão.");
    const atual = mapPlano(linha as Record<string, unknown>);

    if ((e.status === "em_andamento" || e.status === "concluido") && !e.acao) {
      throw new Error(`Informe a ação corretiva antes de marcar o plano como ${rotuloStatusPlano(e.status).toLowerCase()}.`);
    }
    if (e.prazo && e.prazo !== atual.prazo && !prazoValido(e.prazo, hoje)) throw new Error("O prazo não pode estar no passado.");

    // A descrição só muda nos planos lançados à mão ou de indicador; nos dos checklists ela é o desvio.
    const livre = atual.origemTipo === "manual" || atual.origemTipo === "indicador";
    const descricao = livre && e.descricao ? e.descricao : atual.descricao;
    if (descricao !== atual.descricao && estaAberto({ status: e.status })) {
      if (planoDuplicado(await planosAbertosDaLoja(ctx, atual.lojaId), { lojaId: atual.lojaId, descricao }, pid)) throw new Error(MSG_DUPLICADO);
    }

    const { data, error } = await ctx.db
      .from("rede_planos_acao")
      .update({ descricao, acao: e.acao, responsavel: e.responsavel, prazo: e.prazo, prioridade: e.prioridade, status: e.status, evidencia: e.evidencia, observacoes: e.observacoes })
      .eq("id", pid)
      .eq("tenant_id", ctx.tenant.id)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Plano não encontrado ou sem permissão.");
    atualizar(slug);
    return actionOk();
  });
}

/** Confirma que a ação concluída resolveu o desvio. Só quem acompanha a loja de fora (não o gerente que executou). */
export async function verificarPlanoAction(slug: string, id: string): Promise<ActionResult> {
  return executar("Não foi possível verificar o plano.", async () => {
    const ctx = await exigirEdicao(slug, "planos_acao");
    if (!ctx.perfil || !PAPEIS_QUE_VERIFICAM.includes(ctx.perfil.papel)) throw new Error("Seu perfil não pode verificar a conclusão de planos de ação.");
    const pid = lerEntrada(uuid, id);
    const { data, error } = await ctx.db
      .from("rede_planos_acao")
      .update({ verificado_em: new Date().toISOString() })
      .eq("id", pid)
      .eq("tenant_id", ctx.tenant.id)
      .eq("status", "concluido")
      .is("verificado_em", null)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Só é possível verificar um plano concluído que ainda não foi verificado.");
    atualizar(slug);
    return actionOk();
  });
}

/** Só planos lançados à mão ou de indicador. Os dos checklists são cancelados (o registro de origem continua contando a história). */
export async function excluirPlanoAction(slug: string, id: string): Promise<ActionResult> {
  return executar("Não foi possível excluir o plano.", async () => {
    const ctx = await exigirEdicao(slug, "planos_acao");
    const pid = lerEntrada(uuid, id);
    const { data: linha, error: erroLeitura } = await ctx.db.from("rede_planos_acao").select("id,origem_tipo").eq("id", pid).eq("tenant_id", ctx.tenant.id).maybeSingle();
    if (erroLeitura) throw erroLeitura;
    if (!linha) throw new Error("Plano não encontrado ou sem permissão.");
    if (linha.origem_tipo === "qualidade" || linha.origem_tipo === "delivery") {
      throw new Error("Planos que vieram de um checklist não são excluídos: cancele o plano. Se o desvio for corrigido no checklist, o plano é retirado sozinho.");
    }
    const { data, error } = await ctx.db.from("rede_planos_acao").delete().eq("id", pid).eq("tenant_id", ctx.tenant.id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Plano não encontrado ou sem permissão.");
    atualizar(slug);
    return actionOk();
  });
}

/* ------------------------------------------------------------------ desvios do checklist de delivery */

/**
 * Gera um plano de ação por desvio do checklist de delivery (indicador fora da meta ou item da rotina marcado "Não").
 * Nunca duplica: o desvio já tem plano → fica como está. Desvio que deixou de existir tem o plano removido (se nunca
 * saiu do papel) ou cancelado (se já tinha ação). Plano concluído ou cancelado não é mexido.
 */
export async function gerarPlanosDeliveryAction(slug: string, registroId: string): Promise<ActionResultWith<ResultadoGerarPlanos>> {
  return executar("Não foi possível gerar os planos de ação.", async () => {
    const ctx = await exigirEdicao(slug, "planos_acao");
    const rid = lerEntrada(uuid, registroId);
    const hoje = hojeDoTenant();

    const { data: linha, error: erroLeitura } = await ctx.db.from("rede_delivery_registros").select("*").eq("id", rid).eq("tenant_id", ctx.tenant.id).maybeSingle();
    if (erroLeitura) throw erroLeitura;
    if (!linha) throw new Error("Checklist não encontrado ou sem permissão.");
    const registro = mapRegistroDelivery(linha as Record<string, unknown>);
    const loja = await lojaVisivel(ctx, registro.lojaId);
    if (loja.status === "inativa") throw new Error("A loja está inativa.");

    const base = await carregarBase(ctx);
    const sugeridos = planosSugeridos(avaliarRegistro(registro, base.metas, base.config.toleranciaSemaforoPct).desvios);

    const { data: existentesRaw, error: erroPlanos } = await ctx.db.from("rede_planos_acao").select(COLUNAS_PLANO).eq("origem_tipo", "delivery").eq("origem_id", rid).limit(100);
    if (erroPlanos) throw erroPlanos;
    const existentes = ((existentesRaw ?? []) as Record<string, unknown>[]).map(mapPlano);
    const refsExistentes = new Set(existentes.map((p) => p.origemRef));
    const refsAtuais = new Set(sugeridos.map((s) => s.ref));

    const novos = sugeridos.filter((s) => !refsExistentes.has(s.ref));
    if (novos.length > 0) {
      const rotulo = rotuloOrigemDelivery(registro);
      const { error } = await ctx.db.from("rede_planos_acao").insert(
        novos.map((n) => ({ tenant_id: ctx.tenant.id, loja_id: registro.lojaId, origem_tipo: "delivery", origem_id: rid, origem_ref: n.ref, origem_rotulo: rotulo, descricao: n.descricao, prioridade: n.prioridade, status: "pendente" })),
      );
      if (error) {
        if ((error as { code?: string }).code === "23505") throw new Error("Os planos deste checklist já foram gerados. Atualize a página para vê-los.");
        throw error;
      }
    }

    let retirados = 0;
    let cancelados = 0;
    for (const p of existentes) {
      if (!p.origemRef || refsAtuais.has(p.origemRef) || !estaAberto(p)) continue;
      if (p.status === "pendente" && !p.acao && !p.evidencia) {
        const { error } = await ctx.db.from("rede_planos_acao").delete().eq("id", p.id).eq("tenant_id", ctx.tenant.id);
        if (error) throw error;
        retirados++;
      } else {
        const nota = `Desvio retirado ao corrigir o checklist em ${dmy(hoje)}.`;
        const { error } = await ctx.db
          .from("rede_planos_acao")
          .update({ status: "cancelado", observacoes: (p.observacoes ? `${p.observacoes}\n${nota}` : nota).slice(0, 1000) })
          .eq("id", p.id)
          .eq("tenant_id", ctx.tenant.id);
        if (error) throw error;
        cancelados++;
      }
    }

    atualizar(slug);
    return actionOkWith({ criados: novos.length, existentes: sugeridos.length - novos.length, retirados, cancelados });
  });
}

/* ------------------------------------------------------------------ histórico de alterações do plano */

/** Só administrador e consultor leem o histórico (o banco também barra os demais). */
export async function historicoPlanoAction(slug: string, id: string): Promise<ActionResultWith<{ itens: ItemHistoricoPlano[] }>> {
  return executar("Não foi possível carregar o histórico.", async () => {
    const ctx = await getRedeContexto(slug);
    if (ctx.perfil?.papel !== "administrador" && ctx.perfil?.papel !== "consultor") return actionFail("Seu perfil não tem acesso ao histórico de alterações.");
    const pid = lerEntrada(uuid, id);
    const { data, error } = await ctx.db
      .from("rede_historico")
      .select("id,acao,antes,depois,user_id,created_at")
      .eq("tenant_id", ctx.tenant.id)
      .eq("entidade", "rede_planos_acao")
      .eq("registro_id", pid)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(100);
    if (error) throw error;
    const membros = await listMembers(ctx.tenant.id);
    const nomes = new Map(membros.map((m) => [m.userId, m.profile.fullName ?? m.profile.email ?? "Usuário"] as const));
    const itens: ItemHistoricoPlano[] = ((data ?? []) as Record<string, unknown>[]).map((h) => {
      const acao = h.acao === "insert" || h.acao === "delete" ? h.acao : "update";
      const mudancas = descreverAlteracao(acao, h.antes as Record<string, unknown> | null, h.depois as Record<string, unknown> | null);
      return { id: String(h.id), quando: String(h.created_at), acao, usuario: typeof h.user_id === "string" ? (nomes.get(h.user_id) ?? "Usuário") : "Sistema", mudancas };
    });
    return actionOkWith({ itens });
  });
}
