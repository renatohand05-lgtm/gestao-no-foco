import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import {
  formatVeiculoLabel,
  type VeiculoOption,
} from "@/lib/ordens/veiculo-shared";
import type { Database } from "@/types/database";

export type { VeiculoOption };
export { formatVeiculoLabel };

export type Veiculo = {
  id: string;
  tenant_id: string;
  cliente_id: string;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
  versao: string | null;
  ano: number | null;
  cor: string | null;
  combustivel: string | null;
  cambio: string | null;
  quilometragem: number | null;
  chassi: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
};

export type VeiculoInput = {
  cliente_id: string;
  placa?: string | null;
  marca?: string | null;
  modelo?: string | null;
  versao?: string | null;
  ano?: number | null;
  cor?: string | null;
  combustivel?: string | null;
  cambio?: string | null;
  quilometragem?: number | null;
  chassi?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
};

function normalizePlaca(placa: string) {
  return placa.replace(/\s+/g, "").toUpperCase();
}

function toOption(row: Veiculo): VeiculoOption {
  return {
    id: row.id,
    placa: row.placa,
    marca: row.marca,
    modelo: row.modelo,
    ano: row.ano,
    cor: row.cor,
  };
}

export class VeiculoService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async listByCliente(clienteId: string): Promise<Veiculo[]> {
    await this.assertCliente(clienteId);
    const { data, error } = await this.supabase
      .from("veiculos")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", clienteId)
      .eq("ativo", true)
      .is("deleted_at", null)
      .order("placa");

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Veiculo[];
  }

  async listOptionsByCliente(clienteId: string): Promise<VeiculoOption[]> {
    const rows = await this.listByCliente(clienteId);
    return rows.map(toOption);
  }

  async getById(id: string): Promise<Veiculo | null> {
    const { data, error } = await this.supabase
      .from("veiculos")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as unknown as Veiculo | null;
  }

  async create(input: VeiculoInput): Promise<Veiculo> {
    const rawPlaca = input.placa?.trim() ? normalizePlaca(input.placa) : null;
    await this.assertCliente(input.cliente_id);
    if (rawPlaca) await this.assertPlacaUnique(rawPlaca);

    const { data, error } = await this.supabase
      .from("veiculos")
      .insert({
        tenant_id: this.tenantId,
        cliente_id: input.cliente_id,
        placa: rawPlaca,
        marca: input.marca ?? null,
        modelo: input.modelo ?? null,
        versao: input.versao ?? null,
        ano: input.ano ?? null,
        cor: input.cor ?? null,
        combustivel: input.combustivel ?? null,
        cambio: input.cambio ?? null,
        quilometragem: input.quilometragem ?? null,
        chassi: input.chassi ?? null,
        observacoes: input.observacoes ?? null,
        ativo: input.ativo ?? true,
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as unknown as Veiculo;
  }

  async update(id: string, input: Partial<VeiculoInput>): Promise<Veiculo> {
    const current = await this.getById(id);
    if (!current) throw new Error("Veículo não encontrado.");

    const placa =
      input.placa !== undefined
        ? input.placa?.trim()
          ? normalizePlaca(input.placa)
          : null
        : current.placa;
    if (placa && placa !== current.placa) await this.assertPlacaUnique(placa, id);

    const { data, error } = await this.supabase
      .from("veiculos")
      .update({
        placa,
        marca: input.marca ?? current.marca,
        modelo: input.modelo ?? current.modelo,
        versao: input.versao ?? current.versao,
        ano: input.ano ?? current.ano,
        cor: input.cor ?? current.cor,
        combustivel: input.combustivel ?? current.combustivel,
        cambio: input.cambio ?? current.cambio,
        quilometragem: input.quilometragem ?? current.quilometragem,
        chassi: input.chassi ?? current.chassi,
        observacoes: input.observacoes ?? current.observacoes,
        ativo: input.ativo ?? current.ativo,
      } as never)
      .eq("id", id)
      .eq("tenant_id", this.tenantId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as unknown as Veiculo;
  }

  private async assertCliente(clienteId: string) {
    const { data, error } = await this.supabase
      .from("clientes")
      .select("id")
      .eq("tenant_id", this.tenantId)
      .eq("id", clienteId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Cliente inválido para este tenant.");
  }

  private async assertPlacaUnique(placa: string, excludeId?: string) {
    let query = this.supabase
      .from("veiculos")
      .select("id")
      .eq("tenant_id", this.tenantId)
      .ilike("placa", placa)
      .is("deleted_at", null)
      .limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    if (data) throw new Error("Já existe veículo com esta placa neste tenant.");
  }
}

export async function createVeiculoService(tenantId: string) {
  const supabase = await createClient();
  return new VeiculoService(supabase, tenantId);
}
