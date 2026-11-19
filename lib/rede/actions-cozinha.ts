"use server";

import { revalidatePath } from "next/cache";

import { actionFail, actionOk, type ActionResult } from "@/types/action-result";

import { lerEntrada, traduzir, uuid } from "./acao-comum";
import { exigirEdicao, type RedeContexto } from "./acesso";
import { dataDoRegistro } from "./delivery";
import { hojeDoTenant } from "./loader";
import {
  ajusteEstoqueSchema,
  deliverySchema,
  produtoSchema,
  rupturaSchema,
  type AjusteEstoqueEntrada,
  type DeliveryEntrada,
  type ProdutoEntrada,
  type RupturaEntrada,
} from "./schemas-cozinha";

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

/** Ignora acento e caixa só na comparação de duplicados (o banco guarda o texto como foi digitado). */
const semAcento = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/* ------------------------------------------------------------------ rupturas */

function linhaRuptura(r: ReturnType<typeof rupturaSchema.parse>, tenantId: string) {
  return { tenant_id: tenantId, loja_id: r.lojaId, data: r.data, item: r.item, motivo: r.motivo, horas: r.horas, acao: r.acao };
}

/** Ruptura igual (mesma loja, dia, item e motivo) já registrada? `ignorar` = a que está sendo editada. */
async function jaRegistrada(ctx: RedeContexto, r: { lojaId: string; data: string; item: string; motivo: string }, ignorar?: string): Promise<boolean> {
  const { data, error } = await ctx.db.from("rede_rupturas").select("id,item").eq("loja_id", r.lojaId).eq("data", r.data).eq("motivo", r.motivo).limit(200);
  if (error) throw error;
  const alvo = semAcento(r.item);
  return ((data ?? []) as { id: string; item: string }[]).some((x) => x.id !== ignorar && semAcento(x.item) === alvo);
}

const MSG_DUPLICADA = "Esta ruptura já está registrada (mesma loja, dia, item e motivo). Para corrigir horas ou ação, edite o registro existente.";

export async function registrarRupturaAction(slug: string, entrada: RupturaEntrada): Promise<ActionResult> {
  return executar("Não foi possível registrar a ruptura.", async () => {
    const ctx = await exigirEdicao(slug, "rupturas");
    const r = lerEntrada(rupturaSchema, entrada);
    if (r.data > hojeDoTenant()) throw new Error("A data da ruptura não pode ser futura.");
    const loja = await lojaVisivel(ctx, r.lojaId);
    if (loja.status === "inativa") throw new Error("A loja está inativa.");
    if (await jaRegistrada(ctx, r)) throw new Error(MSG_DUPLICADA);
    const { error } = await ctx.db.from("rede_rupturas").insert({ ...linhaRuptura(r, ctx.tenant.id), origem: "manual" });
    if (error) throw error;
    atualizar(slug);
    return actionOk();
  });
}

export async function atualizarRupturaAction(slug: string, id: string, entrada: RupturaEntrada): Promise<ActionResult> {
  return executar("Não foi possível salvar a ruptura.", async () => {
    const ctx = await exigirEdicao(slug, "rupturas");
    const rid = lerEntrada(uuid, id);
    const r = lerEntrada(rupturaSchema, entrada);
    if (r.data > hojeDoTenant()) throw new Error("A data da ruptura não pode ser futura.");
    await lojaVisivel(ctx, r.lojaId);
    if (await jaRegistrada(ctx, r, rid)) throw new Error(MSG_DUPLICADA);
    const { data, error } = await ctx.db.from("rede_rupturas").update(linhaRuptura(r, ctx.tenant.id)).eq("id", rid).eq("tenant_id", ctx.tenant.id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Ruptura não encontrada ou sem permissão.");
    atualizar(slug);
    return actionOk();
  });
}

export async function excluirRupturaAction(slug: string, id: string): Promise<ActionResult> {
  return executar("Não foi possível excluir a ruptura.", async () => {
    const ctx = await exigirEdicao(slug, "rupturas");
    const rid = lerEntrada(uuid, id);
    const { data, error } = await ctx.db.from("rede_rupturas").delete().eq("id", rid).eq("tenant_id", ctx.tenant.id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Ruptura não encontrada ou sem permissão.");
    atualizar(slug);
    return actionOk();
  });
}

/* ------------------------------------------------------------------ estoque da cozinha central */

const MSG_ITEM_REPETIDO = "Já existe um item com esse nome no estoque da cozinha central.";

export async function salvarProdutoAction(slug: string, entrada: ProdutoEntrada): Promise<ActionResult> {
  return executar("Não foi possível salvar o item.", async () => {
    const ctx = await exigirEdicao(slug, "estoque_cc");
    const p = lerEntrada(produtoSchema, entrada);
    const valores = { tenant_id: ctx.tenant.id, item: p.item, unidade: p.unidade, atual: p.atual, minimo: p.minimo, consumo_dia: p.consumoDia, custo_unitario: p.custo };
    if (p.id) {
      const { data, error } = await ctx.db.from("rede_cc_estoque").update(valores).eq("id", p.id).eq("tenant_id", ctx.tenant.id).select("id");
      if (error) {
        if ((error as { code?: string }).code === "23505") throw new Error(MSG_ITEM_REPETIDO);
        throw error;
      }
      if (!data || data.length === 0) throw new Error("Item não encontrado ou sem permissão.");
    } else {
      const { error } = await ctx.db.from("rede_cc_estoque").insert({ ...valores, origem: "manual" });
      if (error) {
        if ((error as { code?: string }).code === "23505") throw new Error(MSG_ITEM_REPETIDO);
        throw error;
      }
    }
    atualizar(slug);
    return actionOk();
  });
}

/** Ajuste rápido na tabela: só os números que mudaram (atual, mínimo e/ou consumo diário). */
export async function ajustarEstoqueAction(slug: string, entrada: AjusteEstoqueEntrada): Promise<ActionResult> {
  return executar("Não foi possível ajustar o estoque.", async () => {
    const ctx = await exigirEdicao(slug, "estoque_cc");
    const a = lerEntrada(ajusteEstoqueSchema, entrada);
    const valores: Record<string, number> = {};
    if (a.atual !== undefined) valores.atual = a.atual;
    if (a.minimo !== undefined) valores.minimo = a.minimo;
    if (a.consumoDia !== undefined) valores.consumo_dia = a.consumoDia;
    const { data, error } = await ctx.db.from("rede_cc_estoque").update(valores).eq("id", a.id).eq("tenant_id", ctx.tenant.id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Item não encontrado ou sem permissão.");
    atualizar(slug);
    return actionOk();
  });
}

export async function excluirProdutoAction(slug: string, id: string): Promise<ActionResult> {
  return executar("Não foi possível excluir o item.", async () => {
    const ctx = await exigirEdicao(slug, "estoque_cc");
    const pid = lerEntrada(uuid, id);
    const { data, error } = await ctx.db.from("rede_cc_estoque").delete().eq("id", pid).eq("tenant_id", ctx.tenant.id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Item não encontrado ou sem permissão.");
    atualizar(slug);
    return actionOk();
  });
}

/* ------------------------------------------------------------------ checklist de delivery */

const MSG_DELIVERY_REPETIDO = "Já existe um checklist desta loja neste dia (ou nesta semana). Edite aquele registro ou exclua-o antes.";

/**
 * Grava o checklist de uma loja. Sem `id`: se a loja já tem checklist no mesmo dia e período, ele é corrigido
 * (nunca duplica). Com `id` (edição): atualiza o registro, e se a nova data/período colidir com outro, recusa.
 * O semanal fica sempre na segunda-feira da semana escolhida.
 */
export async function salvarDeliveryAction(slug: string, entrada: DeliveryEntrada, id?: string | null): Promise<ActionResult> {
  return executar("Não foi possível salvar o checklist.", async () => {
    const ctx = await exigirEdicao(slug, "delivery");
    const d = lerEntrada(deliverySchema, entrada);
    const rid = id ? lerEntrada(uuid, id) : null;
    const dia = dataDoRegistro(d.periodo, d.data);
    if (d.data > hojeDoTenant()) throw new Error("A data do checklist não pode ser futura.");
    const loja = await lojaVisivel(ctx, d.lojaId);
    if (loja.status === "inativa") throw new Error("A loja está inativa.");

    const valores = {
      tenant_id: ctx.tenant.id,
      loja_id: d.lojaId,
      data: dia,
      periodo: d.periodo,
      responsavel: d.responsavel,
      preparo: d.preparo,
      cancelamentos: d.cancelamentos,
      nota_ifood: d.notaIfood,
      tempo_online: d.tempoOnline,
      rupturas: d.rupturas,
      pedidos: d.pedidos,
      ticket_medio: d.ticketMedio,
      conversao: d.conversao,
      atrasos: d.atrasos,
      comissoes: d.comissoes,
      frete_subsidiado: d.freteSubsidiado,
      promocoes: d.promocoes,
      custo_pedido: d.custoPedido,
      rotina: d.rotina,
      observacoes: d.observacoes,
    };

    if (rid) {
      const { data, error } = await ctx.db.from("rede_delivery_registros").update(valores).eq("id", rid).eq("tenant_id", ctx.tenant.id).select("id");
      if (error) {
        if ((error as { code?: string }).code === "23505") throw new Error(MSG_DELIVERY_REPETIDO);
        throw error;
      }
      if (!data || data.length === 0) throw new Error("Checklist não encontrado ou sem permissão.");
    } else {
      const { error } = await ctx.db.from("rede_delivery_registros").upsert({ ...valores, origem: "manual" }, { onConflict: "loja_id,data,periodo" });
      if (error) throw error;
    }
    atualizar(slug);
    return actionOk();
  });
}

export async function excluirDeliveryAction(slug: string, id: string): Promise<ActionResult> {
  return executar("Não foi possível excluir o checklist.", async () => {
    const ctx = await exigirEdicao(slug, "delivery");
    const rid = lerEntrada(uuid, id);
    const { data, error } = await ctx.db.from("rede_delivery_registros").delete().eq("id", rid).eq("tenant_id", ctx.tenant.id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Checklist não encontrado ou sem permissão.");
    atualizar(slug);
    return actionOk();
  });
}
