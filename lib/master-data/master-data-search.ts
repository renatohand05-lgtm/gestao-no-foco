import type { SupabaseClient } from "@supabase/supabase-js";

import { formatDreHierarchyPath } from "@/lib/dre";
import { DRE_DETALHE_DEFS, DRE_LINHA_LABELS } from "@/lib/dre";
import type { DreLinhaEconomica } from "@/lib/dre/dre-types";
import { onlyDigits } from "@/lib/clientes/masks";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { MasterSearchHit } from "@/lib/master-data/master-data-types";

const LIMIT_PER_TYPE = 5;

export class MasterDataSearchService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
    private readonly tenantSlug: string,
  ) {}

  async search(query: string): Promise<MasterSearchHit[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    const pattern = `%${q}%`;
    const digits = onlyDigits(q);
    const base = `/${this.tenantSlug}`;

    const [
      fornecedores,
      clientes,
      clientesPorPlaca,
      clientesPorVeiculo,
      clientesPorTag,
      produtos,
      categorias,
      planos,
      centros,
      contasPagar,
    ] = await Promise.all([
      this.supabase
        .from("fornecedores")
        .select("id, nome, documento, nome_fantasia")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .or(`nome.ilike.${pattern},nome_fantasia.ilike.${pattern},documento.ilike.${pattern}`)
        .limit(LIMIT_PER_TYPE),
      this.supabase
        .from("clientes" as never)
        .select("id, nome, documento, email, telefone, whatsapp, cidade, consultor_id")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .or(
          [
            `nome.ilike.${pattern}`,
            `documento.ilike.${pattern}`,
            `email.ilike.${pattern}`,
            `telefone.ilike.${pattern}`,
            `whatsapp.ilike.${pattern}`,
            `cidade.ilike.${pattern}`,
            digits ? `documento.ilike.%${digits}%` : null,
            digits ? `telefone.ilike.%${digits}%` : null,
            digits ? `whatsapp.ilike.%${digits}%` : null,
          ]
            .filter(Boolean)
            .join(","),
        )
        .limit(LIMIT_PER_TYPE),
      this.supabase
        .from("veiculos")
        .select("id, placa, cliente_id")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .ilike("placa", pattern)
        .limit(LIMIT_PER_TYPE),
      this.supabase
        .from("veiculos")
        .select("id, placa, cliente_id, marca, modelo")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .or(`marca.ilike.${pattern},modelo.ilike.${pattern}`)
        .limit(LIMIT_PER_TYPE),
      this.supabase
        .from("entity_tags" as never)
        .select("entity_id, tags:tags ( nome )")
        .eq("tenant_id", this.tenantId)
        .eq("entity_type", "cliente")
        .limit(50),
      this.supabase
        .from("produtos")
        .select("id, nome, sku, tipo")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .or(`nome.ilike.${pattern},sku.ilike.${pattern}`)
        .limit(LIMIT_PER_TYPE),
      this.supabase
        .from("categorias_financeiras")
        .select("id, nome, tipo, dre_linha, dre_detalhe")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .ilike("nome", pattern)
        .limit(LIMIT_PER_TYPE),
      this.supabase
        .from("plano_contas")
        .select("id, codigo, nome, dre_linha")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .or(`nome.ilike.${pattern},codigo.ilike.${pattern}`)
        .limit(LIMIT_PER_TYPE),
      this.supabase
        .from("centros_custo")
        .select("id, codigo, nome")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .or(`nome.ilike.${pattern},codigo.ilike.${pattern}`)
        .limit(LIMIT_PER_TYPE),
      this.supabase
        .from("contas_pagar")
        .select("id, descricao, numero")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .ilike("descricao", pattern)
        .limit(LIMIT_PER_TYPE),
    ]);

    const hits: MasterSearchHit[] = [];
    const placaClienteIds = new Set<string>();
    const placaByCliente = new Map<string, string | null>();
    const extraClienteIds = new Set<string>();
    const seenClienteIds = new Set<string>();

    type ClienteSearchRow = {
      id: string;
      nome: string;
      documento: string | null;
      email: string | null;
      telefone: string | null;
      whatsapp: string | null;
      cidade: string | null;
      consultor_id: string | null;
    };

    const clienteRows = (clientes.data ?? []) as ClienteSearchRow[];

    for (const row of fornecedores.data ?? []) {
      hits.push({
        id: row.id,
        type: "fornecedor",
        label: (row as { nome_fantasia?: string | null }).nome_fantasia || row.nome,
        subtitle: row.documento,
        href: `${base}/financeiro/fornecedores/${row.id}`,
      });
    }
    for (const row of clienteRows) {
      seenClienteIds.add(row.id);
      hits.push({
        id: row.id,
        type: "cliente",
        label: row.nome,
        subtitle: row.documento || row.email || row.telefone || row.cidade,
        href: `${base}/clientes/${row.id}`,
      });
    }
    for (const row of clientesPorPlaca.data ?? []) {
      if (!row.cliente_id) continue;
      placaClienteIds.add(row.cliente_id);
      placaByCliente.set(row.cliente_id, row.placa);
    }
    for (const row of clientesPorVeiculo.data ?? []) {
      if (!row.cliente_id) continue;
      extraClienteIds.add(row.cliente_id);
    }
    for (const row of clientesPorTag.data ?? []) {
      const tagNome = (row as { tags?: { nome?: string } | null }).tags?.nome ?? "";
      if (tagNome.toLowerCase().includes(q.toLowerCase())) {
        extraClienteIds.add((row as { entity_id: string }).entity_id);
      }
    }

    const consultorIds = clienteRows
      .map((c) => c.consultor_id)
      .filter(Boolean) as string[];

    const consultorNames = new Map<string, string>();
    if (consultorIds.length) {
      const { data: profiles } = await this.supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", [...new Set(consultorIds)]);
      for (const p of profiles ?? []) {
        consultorNames.set(p.id, p.full_name?.trim() || p.email || p.id.slice(0, 8));
      }
    }

    for (const row of clienteRows) {
      const consultorId = row.consultor_id;
      if (consultorId && consultorNames.get(consultorId)?.toLowerCase().includes(q.toLowerCase())) {
        extraClienteIds.add(row.id);
      }
    }

    const allExtraIds = [...new Set([...placaClienteIds, ...extraClienteIds])].filter(
      (id) => !seenClienteIds.has(id),
    );

    if (allExtraIds.length > 0) {
      const { data: clientesExtra } = await this.supabase
        .from("clientes")
        .select("id, nome")
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .in("id", allExtraIds.slice(0, LIMIT_PER_TYPE * 2));

      for (const cliente of clientesExtra ?? []) {
        const placa = placaByCliente.get(cliente.id);
        hits.push({
          id: cliente.id,
          type: "cliente",
          label: cliente.nome,
          subtitle: placa ? `Placa ${placa}` : "Veículo / tag / consultor",
          href: `${base}/clientes/${cliente.id}`,
        });
      }
    }
    for (const row of produtos.data ?? []) {
      hits.push({
        id: row.id,
        type: row.tipo === "servico" ? "servico" : "produto",
        label: row.nome,
        subtitle: row.sku,
        href: `${base}/produtos/${row.id}`,
      });
    }
    for (const row of categorias.data ?? []) {
      hits.push({
        id: row.id,
        type: "categoria",
        label: row.nome,
        subtitle: formatDreHierarchyPath(
          row.dre_linha as DreLinhaEconomica | null,
          (row as { dre_detalhe?: string | null }).dre_detalhe,
        ),
        href: `${base}/financeiro/categorias/${row.id}`,
      });
    }
    for (const row of planos.data ?? []) {
      hits.push({
        id: row.id,
        type: "plano",
        label: `${row.codigo} · ${row.nome}`,
        subtitle: row.dre_linha
          ? DRE_LINHA_LABELS[row.dre_linha as DreLinhaEconomica]
          : null,
        href: `${base}/financeiro/plano-contas/${row.id}`,
      });
    }
    for (const row of centros.data ?? []) {
      hits.push({
        id: row.id,
        type: "centro_custo",
        label: `${row.codigo} · ${row.nome}`,
        href: `${base}/financeiro/centros-custo/${row.id}`,
      });
    }
    for (const row of contasPagar.data ?? []) {
      hits.push({
        id: row.id,
        type: "conta_pagar",
        label: row.descricao,
        subtitle: `#${row.numero}`,
        href: `${base}/financeiro/contas-pagar/${row.id}`,
      });
    }

    // Linhas DRE (catálogo estático tipado)
    const qn = q.toLowerCase();
    for (const def of DRE_DETALHE_DEFS) {
      if (
        def.label.toLowerCase().includes(qn) ||
        def.codigo.includes(qn.replace(/\s/g, "_"))
      ) {
        hits.push({
          id: def.codigo,
          type: "dre_linha",
          label: def.label,
          subtitle: formatDreHierarchyPath(def.linha, def.codigo),
          href: `${base}/financeiro/dre`,
        });
      }
    }

    return hits.slice(0, 40);
  }
}

export async function createMasterDataSearchService(
  tenantId: string,
  tenantSlug: string,
) {
  const supabase = await createClient();
  return new MasterDataSearchService(supabase, tenantId, tenantSlug);
}
