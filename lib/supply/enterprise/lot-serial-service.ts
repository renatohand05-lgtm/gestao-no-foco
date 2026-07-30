/**
 * Sprint 25.4.3 — Persistência de lote/série (usa tabelas da migration 20260815).
 * Falha explícita se a tabela não existir — sem best-effort permissivo.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  applyLotQuantityDelta,
  lotMovementIdempotencyKey,
  type LotMovementType,
} from "./lot-ledger.ts";
import {
  assertSerialNotDoubleSold,
  assertSerialTransition,
  type SerialStatus,
} from "./serial-ledger.ts";
import { assertNotExpiredForSale } from "./validity-control.ts";

type Client = SupabaseClient;

function isMissingRelation(message: string): boolean {
  return /relation .* does not exist|could not find the table/i.test(message);
}

export async function registerLotEntrance(
  client: Client,
  input: {
    tenantId: string;
    produtoId: string;
    numeroLote: string;
    quantidade: number;
    validade?: string | null;
    fabricacao?: string | null;
    fornecedorId?: string | null;
    nfeEntradaId?: string | null;
    depositoId?: string | null;
    userId?: string | null;
    referenciaId: string;
  },
): Promise<{ loteId: string }> {
  const { data: existing, error: findErr } = await client
    .from("estoque_lotes" as never)
    .select("id, quantidade_atual, status, bloqueado")
    .eq("tenant_id", input.tenantId)
    .eq("produto_id", input.produtoId)
    .eq("numero_lote", input.numeroLote)
    .is("deleted_at", null)
    .maybeSingle();

  if (findErr) {
    if (isMissingRelation(findErr.message)) {
      throw new Error(
        "Tabela estoque_lotes indisponível. Aplique a migration 20260815 antes de usar ledger de lote.",
      );
    }
    throw new Error(findErr.message);
  }

  let loteId: string;
  if (existing && (existing as { id: string }).id) {
    const row = existing as {
      id: string;
      quantidade_atual: number;
      status: string;
      bloqueado: boolean;
    };
    const delta = applyLotQuantityDelta({
      quantidadeAtual: Number(row.quantidade_atual),
      tipo: "entrada",
      quantidade: input.quantidade,
    });
    if (delta.error) throw new Error(delta.error);
    const { error: updErr } = await client
      .from("estoque_lotes" as never)
      .update({
        quantidade_atual: delta.quantidadeNova,
        status: delta.quantidadeNova > 0 ? "disponivel" : "esgotado",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", row.id)
      .eq("tenant_id", input.tenantId);
    if (updErr) throw new Error(updErr.message);
    loteId = row.id;
  } else {
    const { data: created, error: insErr } = await client
      .from("estoque_lotes" as never)
      .insert({
        tenant_id: input.tenantId,
        produto_id: input.produtoId,
        numero_lote: input.numeroLote,
        quantidade_inicial: input.quantidade,
        quantidade_atual: input.quantidade,
        validade: input.validade ?? null,
        fabricacao: input.fabricacao ?? null,
        fornecedor_id: input.fornecedorId ?? null,
        nfe_entrada_id: input.nfeEntradaId ?? null,
        deposito_id: input.depositoId ?? null,
        status: "disponivel",
        created_by: input.userId ?? null,
      } as never)
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    loteId = (created as { id: string }).id;
  }

  const idem = lotMovementIdempotencyKey({
    tenantId: input.tenantId,
    loteId,
    tipo: "entrada",
    referenciaId: input.referenciaId,
  });

  const { data: movDup } = await client
    .from("estoque_lote_movimentos" as never)
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("idempotency_key", idem)
    .maybeSingle();

  if (!(movDup as { id?: string } | null)?.id) {
    const { error: movErr } = await client
      .from("estoque_lote_movimentos" as never)
      .insert({
        tenant_id: input.tenantId,
        lote_id: loteId,
        produto_id: input.produtoId,
        tipo: "entrada" satisfies LotMovementType,
        quantidade: input.quantidade,
        referencia_id: input.referenciaId,
        idempotency_key: idem,
        created_by: input.userId ?? null,
      } as never);
    if (movErr && !isMissingRelation(movErr.message)) {
      throw new Error(movErr.message);
    }
    if (movErr && isMissingRelation(movErr.message)) {
      throw new Error(
        "Tabela estoque_lote_movimentos indisponível. Aplique a migration 20260815.",
      );
    }
  }

  return { loteId };
}

export async function registerSerialEntrance(
  client: Client,
  input: {
    tenantId: string;
    produtoId: string;
    numeroSerie: string;
    fornecedorId?: string | null;
    nfeEntradaId?: string | null;
    depositoId?: string | null;
    userId?: string | null;
  },
): Promise<{ serieId: string }> {
  const numero = input.numeroSerie.trim().toUpperCase();
  const { data: existing, error: findErr } = await client
    .from("estoque_series" as never)
    .select("id, status")
    .eq("tenant_id", input.tenantId)
    .eq("produto_id", input.produtoId)
    .eq("numero_serie", numero)
    .is("deleted_at", null)
    .maybeSingle();

  if (findErr) {
    if (isMissingRelation(findErr.message)) {
      throw new Error(
        "Tabela estoque_series indisponível. Aplique a migration 20260815 antes de usar ledger de série.",
      );
    }
    throw new Error(findErr.message);
  }

  if ((existing as { id?: string } | null)?.id) {
    throw new Error("Série já existe para este produto neste tenant.");
  }

  const { data: created, error: insErr } = await client
    .from("estoque_series" as never)
    .insert({
      tenant_id: input.tenantId,
      produto_id: input.produtoId,
      numero_serie: numero,
      status: "disponivel" satisfies SerialStatus,
      fornecedor_id: input.fornecedorId ?? null,
      nfe_entrada_id: input.nfeEntradaId ?? null,
      deposito_id: input.depositoId ?? null,
      data_entrada: new Date().toISOString(),
      created_by: input.userId ?? null,
    } as never)
    .select("id")
    .single();

  if (insErr) throw new Error(insErr.message);
  return { serieId: (created as { id: string }).id };
}

export async function transitionSerialStatus(
  client: Client,
  input: {
    tenantId: string;
    serieId: string;
    to: SerialStatus;
    clienteId?: string | null;
    vendaId?: string | null;
    osId?: string | null;
    userId?: string | null;
  },
): Promise<void> {
  const { data: row, error } = await client
    .from("estoque_series" as never)
    .select("id, status")
    .eq("id", input.serieId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error.message)) {
      throw new Error(
        "Tabela estoque_series indisponível. Aplique a migration 20260815.",
      );
    }
    throw new Error(error.message);
  }
  if (!row) throw new Error("Série não encontrada.");

  const from = (row as { status: SerialStatus }).status;
  if (input.to === "vendido") assertSerialNotDoubleSold(from);
  assertSerialTransition(from, input.to);

  const { error: updErr } = await client
    .from("estoque_series" as never)
    .update({
      status: input.to,
      cliente_id: input.clienteId ?? undefined,
      venda_id: input.vendaId ?? undefined,
      os_id: input.osId ?? undefined,
      data_saida:
        input.to === "vendido" || input.to === "baixado"
          ? new Date().toISOString()
          : undefined,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", input.serieId)
    .eq("tenant_id", input.tenantId);

  if (updErr) throw new Error(updErr.message);

  await client.from("estoque_serie_eventos" as never).insert({
    tenant_id: input.tenantId,
    serie_id: input.serieId,
    de_status: from,
    para_status: input.to,
    created_by: input.userId ?? null,
  } as never);
}

export function assertLotSaleAllowed(input: {
  controlaValidade: boolean;
  validadeIso: string | null;
  todayIso: string;
  minShelfLifeDays?: number;
}) {
  assertNotExpiredForSale(input);
}
