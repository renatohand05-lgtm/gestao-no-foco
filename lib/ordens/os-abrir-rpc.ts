import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type OsAbrirDuplicate = {
  id: string;
  nome: string;
  matched_on: string;
  veiculo_id?: string;
  placa?: string;
};

export type OsAbrirPayload = {
  mode: "existente" | "novo_cliente";
  cliente_id?: string;
  veiculo_id?: string;
  cliente?: {
    nome: string;
    telefone?: string | null;
    whatsapp?: string | null;
    documento?: string | null;
    email?: string | null;
    tipo_pessoa?: "pf" | "pj";
    origem?: string | null;
  };
  veiculo?: {
    placa: string;
    marca?: string | null;
    modelo?: string | null;
    ano?: number | null;
    quilometragem?: number | null;
  };
  os: {
    quilometragem_entrada?: number | null;
    reclamacao_cliente?: string | null;
    observacoes?: string | null;
    nivel_combustivel?: string | null;
    objetos_deixados?: string | null;
    danos_aparentes?: string | null;
    origem_atendimento?: string | null;
    prioridade?: string | null;
    previsao_entrega?: string | null;
  };
};

export type OsAbrirResult =
  | {
      ok: true;
      os_id: string;
      cliente_id: string;
      veiculo_id: string;
      created_cliente: boolean;
    }
  | {
      ok: false;
      code: "DUPLICATE";
      duplicates: OsAbrirDuplicate[];
    };

export async function abrirOsComClienteAtomico(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  payload: OsAbrirPayload,
  createdBy: string | null,
  forceCreate = false,
): Promise<OsAbrirResult> {
  const { data, error } = await supabase.rpc("abrir_os_com_cliente_atomico", {
    p_tenant_id: tenantId,
    p_payload: payload,
    p_created_by: createdBy,
    p_force_create: forceCreate,
  });

  if (error) throw new Error(error.message);

  const result = data as OsAbrirResult;
  if (!result || typeof result !== "object") {
    throw new Error("Resposta inválida da RPC de abertura de OS.");
  }
  return result;
}

export type OsSearchHit = {
  tipo: "cliente" | "veiculo";
  cliente_id: string;
  cliente_nome: string;
  documento?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  veiculo_id?: string | null;
  placa?: string | null;
  marca?: string | null;
  modelo?: string | null;
};

export class OsClienteSearchService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async search(q: string, limit = 20): Promise<OsSearchHit[]> {
    const term = q.trim();
    if (term.length < 2) return [];

    const digits = term.replace(/\D/g, "");
    const hits: OsSearchHit[] = [];

    let clienteQuery = this.supabase
      .from("clientes")
      .select("id, nome, documento, telefone, whatsapp, email")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .neq("origem", "sistema_balcao")
      .limit(limit);

    const filters = [
      `nome.ilike.%${term}%`,
      `email.ilike.%${term}%`,
      `telefone.ilike.%${term}%`,
      `whatsapp.ilike.%${term}%`,
    ];
    if (digits) {
      filters.push(`documento.ilike.%${digits}%`);
      filters.push(`telefone.ilike.%${digits}%`);
      filters.push(`whatsapp.ilike.%${digits}%`);
    }
    clienteQuery = clienteQuery.or(filters.join(","));

    const { data: clientes, error: cErr } = await clienteQuery;
    if (cErr) throw new Error(cErr.message);

    for (const c of clientes ?? []) {
      hits.push({
        tipo: "cliente",
        cliente_id: c.id,
        cliente_nome: c.nome,
        documento: c.documento,
        telefone: c.telefone,
        whatsapp: (c as { whatsapp?: string | null }).whatsapp,
        email: c.email,
      });
    }

    const placaTerm = term.replace(/\s+/g, "").toUpperCase();
    const { data: veiculos, error: vErr } = await this.supabase
      .from("veiculos")
      .select("id, placa, marca, modelo, cliente_id, cliente:clientes(id, nome, documento, telefone, whatsapp, email)")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .ilike("placa", `%${placaTerm}%`)
      .limit(limit);

    if (vErr) throw new Error(vErr.message);

    for (const v of veiculos ?? []) {
      const cliente = v.cliente as unknown as {
        id: string;
        nome: string;
        documento: string | null;
        telefone: string | null;
        whatsapp?: string | null;
        email: string | null;
      } | null;
      if (!cliente) continue;
      hits.push({
        tipo: "veiculo",
        cliente_id: cliente.id,
        cliente_nome: cliente.nome,
        documento: cliente.documento,
        telefone: cliente.telefone,
        whatsapp: cliente.whatsapp,
        email: cliente.email,
        veiculo_id: v.id,
        placa: v.placa,
        marca: v.marca,
        modelo: v.modelo,
      });
    }

    return hits.slice(0, limit);
  }
}

export async function createOsClienteSearchService(tenantId: string) {
  const supabase = await createClient();
  return new OsClienteSearchService(supabase, tenantId);
}
