"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { listMembers } from "@/lib/equipe/members-service";
import { actionFail, actionOk, type ActionResult, type ActionResultWith } from "@/types/action-result";

import { data, dinheiro, inteiro, lerEntrada, mes, traduzir, uuid } from "./acao-comum";
import { exigirEdicao, getRedeContexto, type RedeContexto } from "./acesso";
import { primeiroDiaDoMes } from "./calculo";
import { hojeDoTenant } from "./loader";
import { podeEditar } from "./permissoes";
import { slugDe } from "./texto";
import { INDICADORES, MODULOS_COLABORADOR } from "./tipos";
import type { ModuloRede } from "./tipos";

/* ------------------------------------------------------------------ utilidades */

async function executar(padrao: string, fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (error) {
    return actionFail(traduzir(error, padrao));
  }
}

function atualizar(slug: string): void {
  revalidatePath(`/${slug}/rede`, "layout");
}

const chaveIndicador = z.enum(INDICADORES.map((i) => i.k) as [string, ...string[]]);

async function lojaVisivel(ctx: RedeContexto, lojaId: string) {
  const { data: row, error } = await ctx.db.from("rede_lojas").select("id,nome,status").eq("id", lojaId).eq("tenant_id", ctx.tenant.id).maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("Loja não encontrada ou sem acesso.");
  return row as { id: string; nome: string; status: string };
}

/* ------------------------------------------------------------------ vendas */

const vendaSchema = z.object({
  lojaId: uuid,
  data,
  salao: dinheiro,
  delivery: dinheiro,
  pedidosSalao: inteiro,
  pedidosDelivery: inteiro,
  observacao: z.string().trim().max(300, "No máximo 300 caracteres.").optional(),
});
export type VendaEntrada = z.input<typeof vendaSchema>;

export async function salvarVendaDiaAction(slug: string, entrada: VendaEntrada): Promise<ActionResult> {
  return executar("Não foi possível salvar a venda.", async () => {
    const ctx = await exigirEdicao(slug, "vendas");
    const v = lerEntrada(vendaSchema, entrada);
    if (v.data > hojeDoTenant()) throw new Error("Não é possível lançar venda de data futura.");
    const loja = await lojaVisivel(ctx, v.lojaId);
    if (loja.status === "inativa") throw new Error("A loja está inativa.");
    const { error } = await ctx.db.from("rede_vendas_dia").upsert(
      {
        tenant_id: ctx.tenant.id,
        loja_id: v.lojaId,
        data: v.data,
        venda_salao: v.salao,
        venda_delivery: v.delivery,
        pedidos_salao: v.pedidosSalao,
        pedidos_delivery: v.pedidosDelivery,
        origem: "manual",
        observacao: v.observacao || null,
      },
      { onConflict: "loja_id,data" },
    );
    if (error) throw error;
    atualizar(slug);
    return actionOk();
  });
}

export async function excluirVendaDiaAction(slug: string, lojaId: string, dia: string): Promise<ActionResult> {
  return executar("Não foi possível excluir o lançamento.", async () => {
    const ctx = await exigirEdicao(slug, "vendas");
    const id = lerEntrada(uuid, lojaId);
    const d = lerEntrada(data, dia);
    await lojaVisivel(ctx, id);
    const { error } = await ctx.db.from("rede_vendas_dia").delete().eq("loja_id", id).eq("data", d);
    if (error) throw error;
    atualizar(slug);
    return actionOk();
  });
}

const importacaoSchema = z.array(vendaSchema.omit({ observacao: true })).min(1, "Nenhuma linha para importar.").max(5000, "Máximo de 5000 linhas por importação.");

export async function importarVendasAction(
  slug: string,
  linhas: z.input<typeof importacaoSchema>,
): Promise<ActionResultWith<{ importadas: number }>> {
  try {
    const ctx = await exigirEdicao(slug, "vendas");
    const itens = lerEntrada(importacaoSchema, linhas);
    const hoje = hojeDoTenant();
    if (itens.some((l) => l.data > hoje)) throw new Error("A importação tem datas futuras.");
    // Uma consulta só para conferir as lojas (o banco também barra, mas a mensagem fica clara).
    const ids = [...new Set(itens.map((l) => l.lojaId))];
    const { data: lojas, error: erroLojas } = await ctx.db.from("rede_lojas").select("id,status").eq("tenant_id", ctx.tenant.id).in("id", ids);
    if (erroLojas) throw erroLojas;
    const ativas = new Set((lojas as { id: string; status: string }[]).filter((l) => l.status !== "inativa").map((l) => l.id));
    if (ids.some((id) => !ativas.has(id))) throw new Error("Alguma loja do arquivo não existe, está inativa ou está fora do seu acesso.");

    let importadas = 0;
    for (let i = 0; i < itens.length; i += 500) {
      const lote = itens.slice(i, i + 500).map((l) => ({
        tenant_id: ctx.tenant.id,
        loja_id: l.lojaId,
        data: l.data,
        venda_salao: l.salao,
        venda_delivery: l.delivery,
        pedidos_salao: l.pedidosSalao,
        pedidos_delivery: l.pedidosDelivery,
        origem: "importacao",
      }));
      const { error } = await ctx.db.from("rede_vendas_dia").upsert(lote, { onConflict: "loja_id,data" });
      if (error) {
        const parcial = importadas > 0 ? ` ${importadas} linhas já foram gravadas; reenvie o arquivo para completar (não duplica).` : "";
        throw new Error(`${traduzir(error, "Falha ao gravar.")}${parcial}`);
      }
      importadas += lote.length;
    }
    atualizar(slug);
    return { success: true, importadas };
  } catch (error) {
    return actionFail(traduzir(error, "Não foi possível importar."));
  }
}

/* ------------------------------------------------------------------ metas e indicadores */

const metaSchema = z
  .object({
    lojaId: uuid.nullable(),
    indicador: chaveIndicador,
    meta: z.number({ message: "Informe um número." }).min(-1_000_000).max(1_000_000_000).nullable(),
    direcao: z.enum(["min", "max"]).nullable(),
    vigencia: data,
  })
  .refine((m) => (m.meta === null) === (m.direcao === null), { path: ["meta"], message: "Informe meta e direção juntas (ou deixe os dois vazios para só acompanhar)." });
export type MetaEntrada = z.input<typeof metaSchema>;

export async function definirMetaAction(slug: string, entrada: MetaEntrada): Promise<ActionResult> {
  return executar("Não foi possível salvar a meta.", async () => {
    const ctx = await exigirEdicao(slug, "metas");
    const m = lerEntrada(metaSchema, entrada);
    if (m.lojaId) await lojaVisivel(ctx, m.lojaId);
    const { error } = await ctx.db.rpc("rede_definir_meta", {
      p_tenant: ctx.tenant.id,
      p_loja: m.lojaId,
      p_indicador: m.indicador,
      p_meta: m.meta,
      p_direcao: m.direcao,
      p_vigencia: m.vigencia,
    });
    if (error) throw error;
    atualizar(slug);
    return actionOk();
  });
}

const metaFatSchema = z.object({ lojaId: uuid, mes, valor: dinheiro.nullable() });

/** Meta de faturamento do mês de uma loja. Valor vazio ou zero remove a meta. */
export async function definirMetaFaturamentoAction(slug: string, entrada: z.input<typeof metaFatSchema>): Promise<ActionResult> {
  return executar("Não foi possível salvar a meta do mês.", async () => {
    const ctx = await exigirEdicao(slug, "metas");
    const m = lerEntrada(metaFatSchema, entrada);
    await lojaVisivel(ctx, m.lojaId);
    const primeiro = primeiroDiaDoMes(m.mes);
    if (m.valor == null || m.valor === 0) {
      const { error } = await ctx.db.from("rede_metas_faturamento").delete().eq("loja_id", m.lojaId).eq("mes", primeiro);
      if (error) throw error;
    } else {
      const { error } = await ctx.db.from("rede_metas_faturamento").upsert({ tenant_id: ctx.tenant.id, loja_id: m.lojaId, mes: primeiro, valor: m.valor }, { onConflict: "loja_id,mes" });
      if (error) throw error;
    }
    atualizar(slug);
    return actionOk();
  });
}

const indicadorMesSchema = z.object({
  lojaId: uuid,
  mes,
  indicador: chaveIndicador,
  valor: z.number({ message: "Informe um número." }).min(-1_000_000).max(1_000_000).nullable(),
});

/** Indicador lançado à mão (os calculados — faturamento e % da meta — não passam por aqui). */
export async function salvarIndicadorMesAction(slug: string, entrada: z.input<typeof indicadorMesSchema>): Promise<ActionResult> {
  return executar("Não foi possível salvar o indicador.", async () => {
    const ctx = await exigirEdicao(slug, "metas");
    const i = lerEntrada(indicadorMesSchema, entrada);
    if (INDICADORES.find((d) => d.k === i.indicador)?.calculado) throw new Error("Este indicador é calculado a partir das vendas e não pode ser digitado.");
    await lojaVisivel(ctx, i.lojaId);
    const primeiro = primeiroDiaDoMes(i.mes);
    if (i.valor == null) {
      const { error } = await ctx.db.from("rede_indicadores_mes").delete().eq("loja_id", i.lojaId).eq("mes", primeiro).eq("indicador", i.indicador);
      if (error) throw error;
    } else {
      const { error } = await ctx.db.from("rede_indicadores_mes").upsert(
        { tenant_id: ctx.tenant.id, loja_id: i.lojaId, mes: primeiro, indicador: i.indicador, valor: i.valor, origem: "manual" },
        { onConflict: "loja_id,mes,indicador" },
      );
      if (error) throw error;
    }
    atualizar(slug);
    return actionOk();
  });
}

/* ------------------------------------------------------------------ lojas, configuração e acessos */

const lojaSchema = z.object({
  id: uuid.optional(),
  nome: z.string().trim().min(1, "Informe o nome.").max(120, "No máximo 120 caracteres."),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífen.").max(60).optional(),
  status: z.enum(["operando", "inauguracao", "inativa"]),
  canais: z.enum(["salao+delivery", "delivery", "salao"]),
  dataInauguracao: data.nullable().optional(),
  inauguracaoPrevista: z.string().trim().max(40, "No máximo 40 caracteres.").nullable().optional(),
  ordem: z.number().int().min(0).max(999).optional(),
});
export type LojaEntrada = z.input<typeof lojaSchema>;

export async function salvarLojaAction(slug: string, entrada: LojaEntrada): Promise<ActionResult> {
  return executar("Não foi possível salvar a loja.", async () => {
    const ctx = await exigirEdicao(slug, "config");
    const l = lerEntrada(lojaSchema, entrada);
    const slugLoja = l.slug || slugDe(l.nome);
    if (!slugLoja) throw new Error("Não foi possível gerar o identificador da loja; informe um.");
    const campos = {
      nome: l.nome,
      slug: slugLoja,
      status: l.status,
      canais: l.canais,
      data_inauguracao: l.dataInauguracao ?? null,
      inauguracao_prevista: l.inauguracaoPrevista || null,
      ordem: l.ordem ?? 0,
    };
    if (l.id) {
      const { data: linhas, error } = await ctx.db.from("rede_lojas").update(campos).eq("id", l.id).eq("tenant_id", ctx.tenant.id).select("id");
      if (error) throw error;
      if (!linhas?.length) throw new Error("Loja não encontrada.");
    } else {
      const { error } = await ctx.db.from("rede_lojas").insert({ ...campos, tenant_id: ctx.tenant.id });
      if (error) throw error;
    }
    atualizar(slug);
    return actionOk();
  });
}

const configSchema = z.object({
  pisoLoja: dinheiro,
  pesos: z.object({
    seg: z.number().min(0.1).max(3),
    ter: z.number().min(0.1).max(3),
    qua: z.number().min(0.1).max(3),
    qui: z.number().min(0.1).max(3),
    sex: z.number().min(0.1).max(3),
    sab: z.number().min(0.1).max(3),
    dom: z.number().min(0.1).max(3),
  }),
  toleranciaCmv: z.number().min(0).max(50),
  toleranciaSemaforoPct: z.number().min(0).max(100),
});
export type ConfigEntrada = z.input<typeof configSchema>;

export async function salvarConfigAction(slug: string, entrada: ConfigEntrada): Promise<ActionResult> {
  return executar("Não foi possível salvar a configuração.", async () => {
    const ctx = await exigirEdicao(slug, "config");
    const c = lerEntrada(configSchema, entrada);
    const { error } = await ctx.db
      .from("rede_config")
      .update({ piso_loja: c.pisoLoja, pesos_dia_semana: c.pesos, tolerancia_cmv: c.toleranciaCmv, tolerancia_semaforo_pct: c.toleranciaSemaforoPct, updated_at: new Date().toISOString() })
      .eq("tenant_id", ctx.tenant.id);
    if (error) throw error;
    atualizar(slug);
    return actionOk();
  });
}

const modulosColaborador = new Set<string>(MODULOS_COLABORADOR.map((m) => m.k));
const acessoSchema = z
  .object({
    userId: uuid,
    papel: z.enum(["consultor", "diretoria", "gerente_regional", "gerente_loja", "colaborador"]),
    todasLojas: z.boolean(),
    lojaIds: z.array(uuid).max(200),
    modulos: z.array(z.string()).max(30),
  })
  .refine((a) => a.todasLojas || a.lojaIds.length > 0, { path: ["lojaIds"], message: "Escolha ao menos uma loja ou marque todas." });
export type AcessoEntrada = z.input<typeof acessoSchema>;

export async function salvarAcessoAction(slug: string, entrada: AcessoEntrada): Promise<ActionResult> {
  return executar("Não foi possível salvar o acesso.", async () => {
    const ctx = await exigirEdicao(slug, "config");
    const a = lerEntrada(acessoSchema, entrada);
    const membros = await listMembers(ctx.tenant.id);
    const membro = membros.find((m) => m.userId === a.userId && m.status === "active");
    if (!membro) throw new Error("Essa pessoa não é membro ativo da empresa. Convide-a primeiro em Equipe.");
    if (membro.role === "owner" || membro.role === "admin") throw new Error("Proprietários e administradores já têm acesso total; não precisam de perfil na rede.");
    let lojaIds = a.todasLojas ? [] : [...new Set(a.lojaIds)];
    if (lojaIds.length > 0) {
      const { data: lojas, error } = await ctx.db.from("rede_lojas").select("id").eq("tenant_id", ctx.tenant.id).in("id", lojaIds);
      if (error) throw error;
      if ((lojas as { id: string }[]).length !== lojaIds.length) throw new Error("Alguma loja escolhida não pertence a esta empresa.");
    } else lojaIds = [];
    const modulos = a.papel === "colaborador" ? [...new Set(a.modulos)].filter((m) => modulosColaborador.has(m)) : [];
    if (a.papel === "colaborador" && modulos.length === 0) throw new Error("Escolha ao menos um módulo para o colaborador.");
    const { error } = await ctx.db.from("rede_acessos").upsert(
      { tenant_id: ctx.tenant.id, user_id: a.userId, papel: a.papel, todas_lojas: a.todasLojas, loja_ids: lojaIds, modulos, status: "active", updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,user_id" },
    );
    if (error) throw error;
    atualizar(slug);
    return actionOk();
  });
}

export async function desativarAcessoAction(slug: string, userId: string): Promise<ActionResult> {
  return executar("Não foi possível remover o acesso.", async () => {
    const ctx = await exigirEdicao(slug, "config");
    const id = lerEntrada(uuid, userId);
    const { error } = await ctx.db.from("rede_acessos").update({ status: "inactive", updated_at: new Date().toISOString() }).eq("tenant_id", ctx.tenant.id).eq("user_id", id);
    if (error) throw error;
    atualizar(slug);
    return actionOk();
  });
}

/* ------------------------------------------------------------------ leitura para telas de gestão */

export type MembroParaAcesso = { userId: string; nome: string; email: string; papelTenant: string };

/** Membros ativos que ainda podem receber perfil na rede (só para quem gerencia a configuração). */
export async function listarMembrosAction(slug: string): Promise<ActionResultWith<{ membros: MembroParaAcesso[] }>> {
  try {
    const ctx = await getRedeContexto(slug);
    if (!podeEditar(ctx.perfil, "config" as ModuloRede)) throw new Error("Você não tem permissão para ver os membros.");
    const membros = await listMembers(ctx.tenant.id);
    return {
      success: true,
      membros: membros
        .filter((m) => m.status === "active" && m.role !== "owner" && m.role !== "admin")
        .map((m) => ({ userId: m.userId, nome: m.profile.fullName ?? m.profile.email ?? "Sem nome", email: m.profile.email ?? "", papelTenant: m.role })),
    };
  } catch (error) {
    return actionFail(traduzir(error, "Não foi possível listar os membros."));
  }
}
