"use server";

import { revalidatePath } from "next/cache";

import { actionFail, actionOk, type ActionResult } from "@/types/action-result";

import { lerEntrada, traduzir, uuid } from "./acao-comum";
import { exigirEdicao, type RedeContexto } from "./acesso";
import { mesDe, primeiroDiaDoMes } from "./calculo";
import { CURVA_PADRAO, ORCAMENTO_PADRAO, PREMISSAS_DRE_PADRAO } from "./financeiro";
import { hojeDoTenant } from "./loader";
import {
  cenarioSchema,
  cmvSchema,
  configExpansaoSchema,
  lancamentoDreSchema,
  premissasSchema,
  semanaSegundaSchema,
  unidadeSchema,
  type CenarioEntrada,
  type CmvEntrada,
  type ConfigExpansaoEntrada,
  type LancamentoDreEntrada,
  type PremissasEntrada,
  type UnidadeEntrada,
} from "./schemas-financeiro";

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

async function lojaVisivel(ctx: RedeContexto, lojaId: string) {
  const { data: row, error } = await ctx.db.from("rede_lojas").select("id,nome,status").eq("id", lojaId).eq("tenant_id", ctx.tenant.id).maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("Loja não encontrada ou sem acesso.");
  return row as { id: string; nome: string; status: string };
}

/* ------------------------------------------------------------------ CMV */

/**
 * Grava (ou corrige) a contagem de uma loja na semana. A semana começa na segunda-feira e não pode ser futura.
 * Os itens da dispersão são gravados antes de apagar os que saíram: se algo falhar no meio, nada se perde.
 */
export async function salvarCmvAction(slug: string, entrada: CmvEntrada): Promise<ActionResult> {
  return executar("Não foi possível salvar a contagem.", async () => {
    const ctx = await exigirEdicao(slug, "cmv");
    const c = lerEntrada(cmvSchema, entrada);
    if (c.semana > hojeDoTenant()) throw new Error("A semana ainda não começou: não é possível lançar a contagem.");
    const loja = await lojaVisivel(ctx, c.lojaId);
    if (loja.status === "inativa") throw new Error("A loja está inativa.");

    const { error } = await ctx.db.from("rede_cmv_semanal").upsert(
      {
        tenant_id: ctx.tenant.id,
        loja_id: c.lojaId,
        semana: c.semana,
        vendas: c.vendas,
        cmv_teorico: c.cmvTeorico,
        estoque_inicial: c.estoqueInicial,
        compras: c.compras,
        transferencias_entrada: c.transferenciasEntrada,
        transferencias_saida: c.transferenciasSaida,
        devolucoes: c.devolucoes,
        estoque_final: c.estoqueFinal,
        responsavel: c.responsavel,
        observacoes: c.observacoes,
        origem: "manual",
      },
      { onConflict: "loja_id,semana" },
    );
    if (error) throw error;

    if (c.itens.length > 0) {
      const { error: erroItens } = await ctx.db.from("rede_cmv_itens").upsert(
        c.itens.map((i) => ({ tenant_id: ctx.tenant.id, loja_id: c.lojaId, semana: c.semana, item: i.item, consumo_teorico: i.consumoTeorico, consumo_real: i.consumoReal })),
        { onConflict: "loja_id,semana,item" },
      );
      if (erroItens) throw erroItens;
    }
    const { data: existentes, error: erroLeitura } = await ctx.db.from("rede_cmv_itens").select("item").eq("loja_id", c.lojaId).eq("semana", c.semana);
    if (erroLeitura) throw erroLeitura;
    const manter = new Set(c.itens.map((i) => i.item));
    const remover = ((existentes ?? []) as { item: string }[]).map((r) => r.item).filter((n) => !manter.has(n));
    if (remover.length > 0) {
      const { error: erroRemocao } = await ctx.db.from("rede_cmv_itens").delete().eq("loja_id", c.lojaId).eq("semana", c.semana).in("item", remover);
      if (erroRemocao) throw erroRemocao;
    }
    atualizar(slug);
    return actionOk();
  });
}

export async function excluirCmvAction(slug: string, lojaId: string, semana: string): Promise<ActionResult> {
  return executar("Não foi possível excluir a contagem.", async () => {
    const ctx = await exigirEdicao(slug, "cmv");
    const id = lerEntrada(uuid, lojaId);
    const s = lerEntrada(semanaSegundaSchema, semana);
    await lojaVisivel(ctx, id);
    // Os itens da dispersão saem junto (exclusão em cascata no banco).
    const { error } = await ctx.db.from("rede_cmv_semanal").delete().eq("loja_id", id).eq("semana", s);
    if (error) throw error;
    atualizar(slug);
    return actionOk();
  });
}

/* ------------------------------------------------------------------ DRE: premissas e lançamentos */

const COLUNAS_PREMISSA = {
  cmv: "cmv",
  pessoal: "pessoal",
  impostos: "impostos",
  custoDelivery: "custo_delivery",
  baseDelivery: "base_delivery",
  manutencao: "manutencao",
  marketing: "marketing",
  cto: "cto",
  agua: "agua",
  energia: "energia",
  mixDelivery: "mix_delivery",
} as const;

async function gravarPremissa(ctx: RedeContexto, lojaId: string | null, valores: Record<string, unknown>): Promise<void> {
  const consulta = ctx.db.from("rede_dre_premissas").select("id").eq("tenant_id", ctx.tenant.id);
  const { data: atual, error: erroLeitura } = await (lojaId ? consulta.eq("loja_id", lojaId) : consulta.is("loja_id", null)).maybeSingle();
  if (erroLeitura) throw erroLeitura;
  if (atual) {
    const { error } = await ctx.db.from("rede_dre_premissas").update(valores).eq("id", (atual as { id: string }).id).eq("tenant_id", ctx.tenant.id);
    if (error) throw error;
  } else {
    const { error } = await ctx.db.from("rede_dre_premissas").insert({ tenant_id: ctx.tenant.id, loja_id: lojaId, ...valores });
    if (error) throw error;
  }
}

/**
 * Premissas do DRE. Sem loja: o padrão da rede (todos os campos; só a gestão da rede grava — o banco também exige).
 * Com loja: só as exceções (campo vazio = usa o padrão); se nada sobrar, a exceção é removida.
 */
export async function salvarPremissasAction(slug: string, entrada: PremissasEntrada): Promise<ActionResult> {
  return executar("Não foi possível salvar as premissas.", async () => {
    const ctx = await exigirEdicao(slug, "dre");
    const p = lerEntrada(premissasSchema, entrada);
    if (p.lojaId) await lojaVisivel(ctx, p.lojaId);
    const valores: Record<string, unknown> = {};
    for (const [k, col] of Object.entries(COLUNAS_PREMISSA)) valores[col] = p.campos[k as keyof typeof COLUNAS_PREMISSA] ?? null;
    if (p.lojaId && Object.values(valores).every((v) => v === null)) {
      const { error } = await ctx.db.from("rede_dre_premissas").delete().eq("tenant_id", ctx.tenant.id).eq("loja_id", p.lojaId);
      if (error) throw error;
    } else {
      await gravarPremissa(ctx, p.lojaId, valores);
    }
    atualizar(slug);
    return actionOk();
  });
}

/** Restaurar: sem loja, o padrão da rede volta ao modelo original; com loja, a exceção é removida (volta ao padrão). */
export async function restaurarPremissasAction(slug: string, lojaId: string | null): Promise<ActionResult> {
  return executar("Não foi possível restaurar as premissas.", async () => {
    const ctx = await exigirEdicao(slug, "dre");
    const id = lojaId === null ? null : lerEntrada(uuid, lojaId);
    if (id) {
      await lojaVisivel(ctx, id);
      const { error } = await ctx.db.from("rede_dre_premissas").delete().eq("tenant_id", ctx.tenant.id).eq("loja_id", id);
      if (error) throw error;
    } else {
      const m = PREMISSAS_DRE_PADRAO;
      await gravarPremissa(ctx, null, {
        cmv: m.cmv,
        pessoal: m.pessoal,
        impostos: m.impostos,
        custo_delivery: m.custoDelivery,
        base_delivery: m.baseDelivery,
        manutencao: m.manutencao,
        marketing: m.marketing,
        cto: m.cto,
        agua: m.agua,
        energia: m.energia,
        mix_delivery: m.mixDelivery,
      });
    }
    atualizar(slug);
    return actionOk();
  });
}

/** Lançamento real (R$) de uma linha do DRE no mês: substitui a estimativa da premissa (nunca soma). */
export async function salvarDreLancamentoAction(slug: string, entrada: LancamentoDreEntrada): Promise<ActionResult> {
  return executar("Não foi possível salvar o lançamento.", async () => {
    const ctx = await exigirEdicao(slug, "dre");
    const l = lerEntrada(lancamentoDreSchema, entrada);
    if (l.mes > mesDe(hojeDoTenant())) throw new Error("Não é possível lançar despesa de mês futuro.");
    const loja = await lojaVisivel(ctx, l.lojaId);
    if (loja.status === "inativa") throw new Error("A loja está inativa.");
    const { error } = await ctx.db.from("rede_dre_lancamentos").upsert(
      { tenant_id: ctx.tenant.id, loja_id: l.lojaId, mes: primeiroDiaDoMes(l.mes), linha: l.linha, valor: l.valor, observacao: l.observacao, origem: "manual" },
      { onConflict: "loja_id,mes,linha" },
    );
    if (error) throw error;
    atualizar(slug);
    return actionOk();
  });
}

export async function excluirDreLancamentoAction(slug: string, id: string): Promise<ActionResult> {
  return executar("Não foi possível excluir o lançamento.", async () => {
    const ctx = await exigirEdicao(slug, "dre");
    const lid = lerEntrada(uuid, id);
    const { data: apagadas, error } = await ctx.db.from("rede_dre_lancamentos").delete().eq("id", lid).eq("tenant_id", ctx.tenant.id).select("id");
    if (error) throw error;
    if (!apagadas?.length) throw new Error("Lançamento não encontrado ou sem permissão.");
    atualizar(slug);
    return actionOk();
  });
}

/* ------------------------------------------------------------------ orçamento: cenários */

function camposCenario(c: ReturnType<typeof cenarioSchema.parse>) {
  return {
    nome: c.nome,
    descricao: c.descricao,
    faturamento: c.faturamento,
    mix_delivery: c.mixDelivery,
    cmv: c.cmv,
    folha: c.folha,
    impostos: c.impostos,
    custo_delivery: c.custoDelivery,
    base_delivery: c.baseDelivery,
    manutencao: c.manutencao,
    marketing: c.marketing,
    cto: c.cto,
    agua: c.agua,
    energia: c.energia,
    curva: c.curva,
  };
}

export async function salvarCenarioAction(slug: string, entrada: CenarioEntrada): Promise<ActionResult> {
  return executar("Não foi possível salvar o cenário.", async () => {
    const ctx = await exigirEdicao(slug, "orcamento");
    const c = lerEntrada(cenarioSchema, entrada);
    let id = c.id;
    if (id) {
      const { data: linhas, error } = await ctx.db.from("rede_orc_cenarios").update(camposCenario(c)).eq("id", id).eq("tenant_id", ctx.tenant.id).select("id");
      if (error) throw error;
      if (!linhas?.length) throw new Error("Cenário não encontrado.");
    } else {
      const { data: criado, error } = await ctx.db.from("rede_orc_cenarios").insert({ ...camposCenario(c), tenant_id: ctx.tenant.id, origem: "manual" }).select("id").single();
      if (error) throw error;
      id = (criado as { id: string }).id;
    }
    atualizar(slug);
    return actionOk(id);
  });
}

/** O cenário padrão é o usado nas unidades sem cenário próprio. Só um por empresa. */
export async function definirCenarioPadraoAction(slug: string, cenarioId: string): Promise<ActionResult> {
  return executar("Não foi possível definir o cenário padrão.", async () => {
    const ctx = await exigirEdicao(slug, "orcamento");
    const id = lerEntrada(uuid, cenarioId);
    const { data: alvo, error: erroAlvo } = await ctx.db.from("rede_orc_cenarios").select("id,padrao").eq("id", id).eq("tenant_id", ctx.tenant.id).maybeSingle();
    if (erroAlvo) throw erroAlvo;
    if (!alvo) throw new Error("Cenário não encontrado.");
    if ((alvo as { padrao: boolean }).padrao) return actionOk();
    const { data: anterior } = await ctx.db.from("rede_orc_cenarios").select("id").eq("tenant_id", ctx.tenant.id).eq("padrao", true).maybeSingle();
    const idAnterior = (anterior as { id: string } | null)?.id ?? null;
    if (idAnterior) {
      const { error } = await ctx.db.from("rede_orc_cenarios").update({ padrao: false }).eq("id", idAnterior).eq("tenant_id", ctx.tenant.id);
      if (error) throw error;
    }
    const { error } = await ctx.db.from("rede_orc_cenarios").update({ padrao: true }).eq("id", id).eq("tenant_id", ctx.tenant.id);
    if (error) {
      // Devolve o padrão anterior para a empresa nunca ficar sem cenário padrão.
      if (idAnterior) await ctx.db.from("rede_orc_cenarios").update({ padrao: true }).eq("id", idAnterior).eq("tenant_id", ctx.tenant.id);
      throw error;
    }
    atualizar(slug);
    return actionOk();
  });
}

export async function excluirCenarioAction(slug: string, cenarioId: string): Promise<ActionResult> {
  return executar("Não foi possível excluir o cenário.", async () => {
    const ctx = await exigirEdicao(slug, "orcamento");
    const id = lerEntrada(uuid, cenarioId);
    const { data: todos, error: erroLeitura } = await ctx.db.from("rede_orc_cenarios").select("id,padrao").eq("tenant_id", ctx.tenant.id);
    if (erroLeitura) throw erroLeitura;
    const lista = (todos ?? []) as { id: string; padrao: boolean }[];
    const alvo = lista.find((x) => x.id === id);
    if (!alvo) throw new Error("Cenário não encontrado.");
    if (alvo.padrao) throw new Error("Este é o cenário padrão. Defina outro como padrão antes de excluir.");
    if (lista.length <= 1) throw new Error("A empresa precisa ter ao menos um cenário.");
    // Unidades que usavam este cenário passam a usar o padrão (o vínculo é limpo no banco).
    const { error } = await ctx.db.from("rede_orc_cenarios").delete().eq("id", id).eq("tenant_id", ctx.tenant.id);
    if (error) throw error;
    atualizar(slug);
    return actionOk();
  });
}

/** Volta o cenário "Base (modelo original)" aos valores do painel original (cria se foi excluído). */
export async function restaurarCenarioBaseAction(slug: string): Promise<ActionResult> {
  return executar("Não foi possível restaurar o cenário base.", async () => {
    const ctx = await exigirEdicao(slug, "orcamento");
    const o = ORCAMENTO_PADRAO;
    const campos = {
      descricao: "Premissas do modelo original de nova loja.",
      faturamento: o.faturamento,
      mix_delivery: o.mixDelivery,
      cmv: o.cmv,
      folha: o.folha,
      impostos: o.impostos,
      custo_delivery: o.custoDelivery,
      base_delivery: o.baseDelivery,
      manutencao: o.manutencao,
      marketing: o.marketing,
      cto: o.cto,
      agua: o.agua,
      energia: o.energia,
      curva: [...CURVA_PADRAO],
    };
    const nome = "Base (modelo original)";
    const { data: atual, error: erroLeitura } = await ctx.db.from("rede_orc_cenarios").select("id").eq("tenant_id", ctx.tenant.id).eq("nome", nome).maybeSingle();
    if (erroLeitura) throw erroLeitura;
    if (atual) {
      const { error } = await ctx.db.from("rede_orc_cenarios").update(campos).eq("id", (atual as { id: string }).id).eq("tenant_id", ctx.tenant.id);
      if (error) throw error;
    } else {
      const { count } = await ctx.db.from("rede_orc_cenarios").select("id", { count: "exact", head: true }).eq("tenant_id", ctx.tenant.id).eq("padrao", true);
      const { error } = await ctx.db.from("rede_orc_cenarios").insert({ ...campos, nome, tenant_id: ctx.tenant.id, padrao: !count, origem: "manual" });
      if (error) throw error;
    }
    atualizar(slug);
    return actionOk();
  });
}

/* ------------------------------------------------------------------ orçamento: inaugurações e rede de N lojas */

export async function salvarUnidadeAction(slug: string, entrada: UnidadeEntrada): Promise<ActionResult> {
  return executar("Não foi possível salvar a unidade.", async () => {
    const ctx = await exigirEdicao(slug, "orcamento");
    const u = lerEntrada(unidadeSchema, entrada);
    if (u.lojaId) await lojaVisivel(ctx, u.lojaId);
    const campos = {
      nome: u.nome,
      abertura_prevista: u.abertura ? primeiroDiaDoMes(u.abertura) : null,
      status: u.status,
      cenario_id: u.cenarioId ?? null,
      loja_id: u.lojaId ?? null,
      faturamento_alvo: u.faturamentoAlvo ?? null,
      observacao: u.observacao,
    };
    if (u.id) {
      const { data: linhas, error } = await ctx.db.from("rede_expansao_unidades").update(campos).eq("id", u.id).eq("tenant_id", ctx.tenant.id).select("id");
      if (error) throw error;
      if (!linhas?.length) throw new Error("Unidade não encontrada.");
    } else {
      const { error } = await ctx.db.from("rede_expansao_unidades").insert({ ...campos, tenant_id: ctx.tenant.id, origem: "manual" });
      if (error) throw error;
    }
    atualizar(slug);
    return actionOk();
  });
}

export async function excluirUnidadeAction(slug: string, unidadeId: string): Promise<ActionResult> {
  return executar("Não foi possível excluir a unidade.", async () => {
    const ctx = await exigirEdicao(slug, "orcamento");
    const id = lerEntrada(uuid, unidadeId);
    const { data: apagadas, error } = await ctx.db.from("rede_expansao_unidades").delete().eq("id", id).eq("tenant_id", ctx.tenant.id).select("id");
    if (error) throw error;
    if (!apagadas?.length) throw new Error("Unidade não encontrada ou sem permissão.");
    atualizar(slug);
    return actionOk();
  });
}

/** Parâmetros da rede de N lojas: meta de lojas, faturamento mínimo por nova loja e quais lojas são a base. */
export async function salvarConfigExpansaoAction(slug: string, entrada: ConfigExpansaoEntrada): Promise<ActionResult> {
  return executar("Não foi possível salvar a configuração da rede.", async () => {
    const ctx = await exigirEdicao(slug, "orcamento");
    const c = lerEntrada(configExpansaoSchema, entrada);
    if (c.lojasBase.length > 0) {
      const { data: lojas, error: erroLojas } = await ctx.db.from("rede_lojas").select("id").eq("tenant_id", ctx.tenant.id).in("id", c.lojasBase);
      if (erroLojas) throw erroLojas;
      if ((lojas ?? []).length !== c.lojasBase.length) throw new Error("Alguma loja-base não existe ou está fora do seu acesso.");
    }
    const { error } = await ctx.db.from("rede_expansao_config").upsert(
      { tenant_id: ctx.tenant.id, meta_lojas: c.metaLojas, faturamento_minimo: c.faturamentoMinimo, lojas_base: c.lojasBase },
      { onConflict: "tenant_id" },
    );
    if (error) throw error;
    atualizar(slug);
    return actionOk();
  });
}
