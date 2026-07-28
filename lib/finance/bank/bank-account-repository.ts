/**
 * Sprint 22.1 — Bank Account repository (contract + memory + supabase).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../types/database.ts";
import type {
  BankAccount,
  BankAccountStatus,
  BankAccountType,
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from "../shared/types.ts";

export type BankAccountRepository = {
  list(tenantId: string): Promise<BankAccount[]>;
  findById(tenantId: string, id: string): Promise<BankAccount | null>;
  create(tenantId: string, input: CreateBankAccountInput): Promise<BankAccount>;
  update(
    tenantId: string,
    id: string,
    input: UpdateBankAccountInput,
  ): Promise<BankAccount>;
  archive(tenantId: string, id: string): Promise<BankAccount>;
};

function mapRow(row: {
  id: string;
  tenant_id: string;
  nome: string;
  tipo: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  saldo_inicial: number;
  saldo_atual: number;
  observacoes: string | null;
  ativo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}): BankAccount {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.nome,
    bank: row.banco,
    agency: row.agencia,
    accountNumber: row.conta,
    type: row.tipo as BankAccountType,
    initialBalance: Number(row.saldo_inicial ?? 0),
    currentBalance: Number(row.saldo_atual ?? 0),
    status: row.deleted_at || !row.ativo ? "archived" : "active",
    notes: row.observacoes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createMemoryBankAccountRepository(
  store: BankAccount[] = [],
): BankAccountRepository {
  return {
    async list(tenantId) {
      return store.filter(
        (a) => a.tenantId === tenantId && a.status === "active",
      );
    },
    async findById(tenantId, id) {
      return (
        store.find((a) => a.tenantId === tenantId && a.id === id) ?? null
      );
    },
    async create(tenantId, input) {
      const now = new Date().toISOString();
      const row: BankAccount = {
        id: `ba_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        tenantId,
        name: input.name,
        bank: input.bank ?? null,
        agency: input.agency ?? null,
        accountNumber: input.accountNumber ?? null,
        type: input.type,
        initialBalance: input.initialBalance ?? 0,
        currentBalance: input.initialBalance ?? 0,
        status: "active",
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      };
      store.push(row);
      return row;
    },
    async update(tenantId, id, input) {
      const row = store.find((a) => a.tenantId === tenantId && a.id === id);
      if (!row) throw new Error("Conta não encontrada.");
      Object.assign(row, {
        name: input.name ?? row.name,
        bank: input.bank !== undefined ? input.bank : row.bank,
        agency: input.agency !== undefined ? input.agency : row.agency,
        accountNumber:
          input.accountNumber !== undefined
            ? input.accountNumber
            : row.accountNumber,
        type: input.type ?? row.type,
        notes: input.notes !== undefined ? input.notes : row.notes,
        status: input.status ?? row.status,
        updatedAt: new Date().toISOString(),
      });
      return row;
    },
    async archive(tenantId, id) {
      return this.update(tenantId, id, { status: "archived" satisfies BankAccountStatus });
    },
  };
}

export function createSupabaseBankAccountRepository(
  client: SupabaseClient<Database>,
): BankAccountRepository {
  return {
    async list(tenantId) {
      const { data, error } = await client
        .from("contas_bancarias")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("nome", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapRow);
    },
    async findById(tenantId, id) {
      const { data, error } = await client
        .from("contas_bancarias")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapRow(data) : null;
    },
    async create(tenantId, input) {
      const { data, error } = await client
        .from("contas_bancarias")
        .insert({
          tenant_id: tenantId,
          nome: input.name,
          tipo: input.type,
          banco: input.bank ?? null,
          agencia: input.agency ?? null,
          conta: input.accountNumber ?? null,
          saldo_inicial: input.initialBalance ?? 0,
          saldo_atual: input.initialBalance ?? 0,
          observacoes: input.notes ?? null,
          ativo: true,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapRow(data);
    },
    async update(tenantId, id, input) {
      const patch: {
        nome?: string;
        tipo?: string;
        banco?: string | null;
        agencia?: string | null;
        conta?: string | null;
        observacoes?: string | null;
        ativo?: boolean;
        deleted_at?: string | null;
      } = {};
      if (input.name !== undefined) patch.nome = input.name;
      if (input.type !== undefined) patch.tipo = input.type;
      if (input.bank !== undefined) patch.banco = input.bank;
      if (input.agency !== undefined) patch.agencia = input.agency;
      if (input.accountNumber !== undefined) patch.conta = input.accountNumber;
      if (input.notes !== undefined) patch.observacoes = input.notes;
      if (input.status === "archived") {
        patch.ativo = false;
        patch.deleted_at = new Date().toISOString();
      }
      if (input.status === "active") {
        patch.ativo = true;
        patch.deleted_at = null;
      }
      const { data, error } = await client
        .from("contas_bancarias")
        .update(patch)
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapRow(data);
    },
    async archive(tenantId, id) {
      return this.update(tenantId, id, { status: "archived" });
    },
  };
}
