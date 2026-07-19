/**
 * Matching de fornecedor e produtos para NF-e.
 * Descrição é apenas sugestão — nunca vínculo automático por similaridade.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { ProductMatchSuggestion } from "@/types/nfe-entrada";

function digits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeDesc(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function matchFornecedorByDocumento(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  documento: string | null,
) {
  const doc = digits(documento);
  if (!doc) return null;

  const { data } = await supabase
    .from("fornecedores")
    .select("id, nome, documento, nome_fantasia")
    .eq("tenant_id", tenantId)
    .eq("documento", doc)
    .is("deleted_at", null)
    .maybeSingle();

  return data;
}

export async function matchProdutoSuggestions(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  input: {
    fornecedorId: string | null;
    codigoFornecedor: string | null;
    ean: string | null;
    descricao: string;
  },
): Promise<ProductMatchSuggestion[]> {
  const suggestions: ProductMatchSuggestion[] = [];
  const seen = new Set<string>();

  const push = (s: ProductMatchSuggestion) => {
    if (seen.has(s.produto_id)) return;
    seen.add(s.produto_id);
    suggestions.push(s);
  };

  // 1) EAN → codigo_barras
  const ean = digits(input.ean);
  if (ean && ean !== "0" && ean.length >= 8) {
    const { data } = await supabase
      .from("produtos")
      .select("id, nome, codigo_barras")
      .eq("tenant_id", tenantId)
      .eq("codigo_barras", ean)
      .is("deleted_at", null)
      .limit(5);
    for (const p of data ?? []) {
      push({
        produto_id: p.id,
        nome: p.nome,
        score: 100,
        reason: "ean",
      });
    }
  }

  // 2) Vínculo fornecedor + código
  if (input.fornecedorId && input.codigoFornecedor?.trim()) {
    const { data: vinculos } = await supabase
      .from("fornecedor_produto_vinculos" as never)
      .select("produto_id, produto:produtos(id, nome)")
      .eq("tenant_id", tenantId)
      .eq("fornecedor_id", input.fornecedorId)
      .eq("codigo_fornecedor", input.codigoFornecedor.trim())
      .is("deleted_at", null)
      .limit(5);

    for (const v of (vinculos as Array<{
      produto_id: string;
      produto: { id: string; nome: string } | null;
    }> | null) ?? []) {
      push({
        produto_id: v.produto_id,
        nome: v.produto?.nome ?? "Produto",
        score: 95,
        reason: "vinculo",
      });
    }
  }

  // 3) SKU / código interno = código fornecedor
  if (input.codigoFornecedor?.trim()) {
    const code = input.codigoFornecedor.trim();
    const { data } = await supabase
      .from("produtos")
      .select("id, nome, sku, codigo_interno")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .or(`sku.eq.${code},codigo_interno.eq.${code}`)
      .limit(5);
    for (const p of data ?? []) {
      push({
        produto_id: p.id,
        nome: p.nome,
        score: p.sku === code ? 85 : 80,
        reason: p.sku === code ? "sku" : "codigo_interno",
      });
    }
  }

  // 4) Descrição normalizada — apenas sugestão baixa
  const desc = normalizeDesc(input.descricao);
  if (desc.length >= 4 && suggestions.length === 0) {
    const token = desc.split(" ")[0] ?? desc;
    const { data } = await supabase
      .from("produtos")
      .select("id, nome")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .ilike("nome", `%${token.slice(0, 40)}%`)
      .limit(5);
    for (const p of data ?? []) {
      const same = normalizeDesc(p.nome) === desc;
      push({
        produto_id: p.id,
        nome: p.nome,
        score: same ? 60 : 40,
        reason: "descricao",
      });
    }
  }

  return suggestions.sort((a, b) => b.score - a.score);
}
