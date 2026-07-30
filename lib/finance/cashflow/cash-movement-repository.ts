/**
 * Sprint 22.1 — Cash movement repository.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/database.ts";
import {
  estornarMovimentacaoBancariaAtomico,
  registrarMovimentacaoBancariaAtomico,
  transferirEntreContasAtomico,
} from "../../financeiro/movimentacao-bancaria-rpc.ts";
import {
  decodeFinanceMeta,
  encodeFinanceMeta,
  stripFinanceMeta,
} from "../shared/meta.ts";
import type {
  CashMovement,
  CashMovementKind,
  CreateMovementInput,
  UpdateMovementInput,
} from "../shared/types.ts";

export type CashMovementRepository = {
  list(
    tenantId: string,
    opts?: { from?: string; to?: string; accountId?: string; limit?: number },
  ): Promise<CashMovement[]>;
  findById(tenantId: string, id: string): Promise<CashMovement | null>;
  create(
    tenantId: string,
    input: CreateMovementInput,
    createdBy: string | null,
  ): Promise<CashMovement>;
  update(
    tenantId: string,
    id: string,
    input: UpdateMovementInput,
  ): Promise<CashMovement>;
  /** Reversão financeira (estorno) — delete semântico. */
  delete(
    tenantId: string,
    id: string,
    createdBy: string | null,
  ): Promise<CashMovement>;
};

function mapKind(tipo: string, transferenciaPapel: string | null): CashMovementKind {
  if (tipo === "entrada" || tipo === "saida" || tipo === "ajuste") return tipo;
  if (transferenciaPapel) return "transferencia";
  return "ajuste";
}

function mapRow(row: {
  id: string;
  tenant_id: string;
  conta_bancaria_id: string;
  conta_bancaria_contrapartida_id: string | null;
  tipo: string;
  transferencia_papel: string | null;
  valor: number;
  data_movimentacao: string;
  descricao: string;
  observacoes: string | null;
  grupo_transferencia_id: string | null;
  movimentacao_estornada_id: string | null;
  saldo_novo: number;
  created_at: string;
}): CashMovement {
  const meta = decodeFinanceMeta(row.observacoes);
  const kind =
    row.movimentacao_estornada_id || meta.kind === "estorno"
      ? ("estorno" as const)
      : mapKind(row.tipo, row.transferencia_papel);
  return {
    id: row.id,
    tenantId: row.tenant_id,
    bankAccountId: row.conta_bancaria_id,
    counterpartyAccountId: row.conta_bancaria_contrapartida_id,
    kind,
    amount: Number(row.valor),
    movementDate: row.data_movimentacao,
    description: row.descricao,
    categoryId: meta.categoryId ?? null,
    costCenterId: meta.costCenterId ?? null,
    notes: stripFinanceMeta(row.observacoes),
    transferGroupId: row.grupo_transferencia_id,
    reversedMovementId: row.movimentacao_estornada_id,
    balanceAfter: Number(row.saldo_novo),
    createdAt: row.created_at,
  };
}

export function createMemoryCashMovementRepository(
  store: CashMovement[] = [],
  balances: Map<string, number> = new Map(),
  accounts?: { id: string; currentBalance: number }[],
): CashMovementRepository {
  function syncBalance(accountId: string, value: number) {
    balances.set(accountId, value);
    const acc = accounts?.find((a) => a.id === accountId);
    if (acc) acc.currentBalance = value;
  }

  function getBalance(accountId: string) {
    if (!balances.has(accountId)) {
      const acc = accounts?.find((a) => a.id === accountId);
      balances.set(accountId, acc?.currentBalance ?? 0);
    }
    return balances.get(accountId) ?? 0;
  }
  return {
    async list(tenantId, opts = {}) {
      return store
        .filter((m) => {
          if (m.tenantId !== tenantId) return false;
          if (opts.accountId && m.bankAccountId !== opts.accountId) return false;
          if (opts.from && m.movementDate < opts.from) return false;
          if (opts.to && m.movementDate > opts.to) return false;
          return true;
        })
        .sort((a, b) => b.movementDate.localeCompare(a.movementDate))
        .slice(0, opts.limit ?? 200);
    },
    async findById(tenantId, id) {
      return store.find((m) => m.tenantId === tenantId && m.id === id) ?? null;
    },
    async create(tenantId, input) {
      if (input.kind === "transferencia") {
        if (!input.toAccountId) throw new Error("Conta destino obrigatória.");
        const outId = `mv_${Date.now().toString(36)}_o`;
        const inId = `mv_${Date.now().toString(36)}_i`;
        const group = `tg_${Date.now().toString(36)}`;
        const balOut = getBalance(input.bankAccountId) - input.amount;
        const balIn = getBalance(input.toAccountId) + input.amount;
        syncBalance(input.bankAccountId, balOut);
        syncBalance(input.toAccountId, balIn);
        const base = {
          tenantId,
          kind: "transferencia" as const,
          amount: input.amount,
          movementDate: input.movementDate,
          description: input.description,
          categoryId: input.categoryId ?? null,
          costCenterId: input.costCenterId ?? null,
          notes: input.notes ?? null,
          transferGroupId: group,
          reversedMovementId: null,
          createdAt: new Date().toISOString(),
        };
        const out: CashMovement = {
          ...base,
          id: outId,
          bankAccountId: input.bankAccountId,
          counterpartyAccountId: input.toAccountId,
          balanceAfter: balOut,
        };
        const inn: CashMovement = {
          ...base,
          id: inId,
          bankAccountId: input.toAccountId,
          counterpartyAccountId: input.bankAccountId,
          balanceAfter: balIn,
        };
        store.push(out, inn);
        return out;
      }

      if (input.kind === "estorno") {
        if (!input.reverseMovementId) throw new Error("Movimentação original obrigatória.");
        const original = store.find(
          (m) => m.tenantId === tenantId && m.id === input.reverseMovementId,
        );
        if (!original) throw new Error("Movimentação original não encontrada.");
        const delta =
          original.kind === "entrada" ||
          (original.kind === "transferencia" && false)
            ? -original.amount
            : original.kind === "saida"
              ? original.amount
              : 0;
        // simplify: reverse sign based on kind
        let next = getBalance(original.bankAccountId);
        if (original.kind === "entrada") next -= original.amount;
        else if (original.kind === "saida") next += original.amount;
        syncBalance(original.bankAccountId, next);
        const row: CashMovement = {
          id: `mv_est_${Date.now().toString(36)}`,
          tenantId,
          bankAccountId: original.bankAccountId,
          counterpartyAccountId: null,
          kind: "estorno",
          amount: original.amount,
          movementDate: input.movementDate,
          description: input.description || `Estorno de ${original.description}`,
          categoryId: input.categoryId ?? original.categoryId,
          costCenterId: input.costCenterId ?? original.costCenterId,
          notes: input.notes ?? null,
          transferGroupId: null,
          reversedMovementId: original.id,
          balanceAfter: next,
          createdAt: new Date().toISOString(),
        };
        store.push(row);
        void delta;
        return row;
      }

      let next = getBalance(input.bankAccountId);
      if (input.kind === "entrada") next += input.amount;
      else if (input.kind === "saida") next -= input.amount;
      syncBalance(input.bankAccountId, next);
      const row: CashMovement = {
        id: `mv_${Date.now().toString(36)}`,
        tenantId,
        bankAccountId: input.bankAccountId,
        counterpartyAccountId: null,
        kind: input.kind,
        amount: input.amount,
        movementDate: input.movementDate,
        description: input.description,
        categoryId: input.categoryId ?? null,
        costCenterId: input.costCenterId ?? null,
        notes: input.notes ?? null,
        transferGroupId: null,
        reversedMovementId: null,
        balanceAfter: next,
        createdAt: new Date().toISOString(),
      };
      store.push(row);
      return row;
    },
    async update(tenantId, id, input) {
      const row = store.find((m) => m.tenantId === tenantId && m.id === id);
      if (!row) throw new Error("Movimentação não encontrada.");
      if (input.description !== undefined) row.description = input.description;
      if (input.notes !== undefined) row.notes = input.notes;
      if (input.categoryId !== undefined) row.categoryId = input.categoryId;
      if (input.costCenterId !== undefined) row.costCenterId = input.costCenterId;
      return row;
    },
    async delete(tenantId, id, createdBy) {
      const original = await this.findById(tenantId, id);
      if (!original) throw new Error("Movimentação não encontrada.");
      return this.create(
        tenantId,
        {
          bankAccountId: original.bankAccountId,
          kind: "estorno",
          amount: original.amount,
          movementDate: new Date().toISOString().slice(0, 10),
          description: `Estorno: ${original.description}`,
          reverseMovementId: id,
          categoryId: original.categoryId,
          costCenterId: original.costCenterId,
        },
        createdBy,
      );
    },
  };
}

export function createSupabaseCashMovementRepository(
  client: SupabaseClient<Database>,
): CashMovementRepository {
  return {
    async list(tenantId, opts = {}) {
      let query = client
        .from("movimentacoes_bancarias")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("data_movimentacao", { ascending: false })
        .limit(opts.limit ?? 100);
      if (opts.accountId) query = query.eq("conta_bancaria_id", opts.accountId);
      if (opts.from) query = query.gte("data_movimentacao", opts.from);
      if (opts.to) query = query.lte("data_movimentacao", opts.to);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapRow);
    },
    async findById(tenantId, id) {
      const { data, error } = await client
        .from("movimentacoes_bancarias")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapRow(data) : null;
    },
    async create(tenantId, input, createdBy) {
      const notes = encodeFinanceMeta(input.notes, {
        categoryId: input.categoryId,
        costCenterId: input.costCenterId,
        kind: input.kind,
      });

      if (input.kind === "transferencia") {
        if (!input.toAccountId) throw new Error("Conta destino obrigatória.");
        const result = await transferirEntreContasAtomico(client, {
          tenantId,
          contaOrigemId: input.bankAccountId,
          contaDestinoId: input.toAccountId,
          valor: input.amount,
          dataMovimentacao: input.movementDate,
          descricao: input.description,
          observacoes: notes,
          createdBy,
        });
        const row = await this.findById(tenantId, result.enviada_id);
        if (!row) throw new Error("Erro ao carregar transferência.");
        return row;
      }

      if (input.kind === "estorno") {
        if (!input.reverseMovementId) {
          throw new Error("Movimentação original obrigatória para estorno.");
        }
        const estornoId = await estornarMovimentacaoBancariaAtomico(client, {
          tenantId,
          movimentacaoId: input.reverseMovementId,
          dataMovimentacao: input.movementDate,
          observacoes: notes,
          createdBy,
        });
        const row = await this.findById(tenantId, estornoId);
        if (!row) throw new Error("Erro ao carregar estorno.");
        return row;
      }

      const tipo =
        input.kind === "entrada" || input.kind === "saida" || input.kind === "ajuste"
          ? input.kind
          : "ajuste";

      const id = await registrarMovimentacaoBancariaAtomico(client, {
        tenantId,
        contaBancariaId: input.bankAccountId,
        tipo,
        valor: input.amount,
        dataMovimentacao: input.movementDate,
        descricao: input.description,
        origem: "manual",
        observacoes: notes,
        createdBy,
      });
      const row = await this.findById(tenantId, id);
      if (!row) throw new Error("Erro ao carregar movimentação.");
      return row;
    },
    async update(tenantId, id, input) {
      const current = await this.findById(tenantId, id);
      if (!current) throw new Error("Movimentação não encontrada.");
      const notes = encodeFinanceMeta(
        input.notes !== undefined ? input.notes : current.notes,
        {
          categoryId:
            input.categoryId !== undefined ? input.categoryId : current.categoryId,
          costCenterId:
            input.costCenterId !== undefined
              ? input.costCenterId
              : current.costCenterId,
          kind: current.kind,
        },
      );
      const { data, error } = await client
        .from("movimentacoes_bancarias")
        .update({
          descricao: input.description ?? current.description,
          observacoes: notes,
        })
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .is("deleted_at", null)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapRow(data);
    },
    async delete(tenantId, id, createdBy) {
      return this.create(
        tenantId,
        {
          bankAccountId: "n/a",
          kind: "estorno",
          amount: 0,
          movementDate: new Date().toISOString().slice(0, 10),
          description: "Estorno",
          reverseMovementId: id,
        },
        createdBy,
      );
    },
  };
}
