/**
 * Sprint 25.3 — Persistência de serviços via ProdutoService (tipo servico).
 * Integra com Import Engine commit pipeline — sem segunda engine.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { ProdutoService } from "@/lib/produtos/produto-service";
import type { Database } from "@/types/database";
import type { DuplicateDecision } from "./duplicate-resolver.ts";

export type ServiceImportRowValues = {
  codigo_servico: string;
  nome_servico: string;
  categoria?: string | null;
  subcategoria?: string | null;
  descricao_curta?: string | null;
  preco_venda?: number | null;
  /** Sprint 27.8 — custo de mão de obra */
  custo?: number | null;
  preco_sugerido?: number | null;
  especialidade?: string | null;
  unidade_cobranca?: string | null;
  tempo_estimado_minutos?: number | null;
  garantia_dias?: number | null;
  status?: string | null;
  observacao_tecnica?: string | null;
  unidade?: string | null;
  tempo_padrao_h?: number | null;
};

export async function commitServiceImportRow(
  client: SupabaseClient<Database>,
  input: {
    tenantId: string;
    userId: string;
    values: ServiceImportRowValues;
    decision: DuplicateDecision;
    existingId?: string | null;
    importRunId?: string | null;
  },
): Promise<{ productId: string; action: "created" | "updated" | "ignored" }> {
  const code = input.values.codigo_servico.trim();
  const nome = input.values.nome_servico.trim();
  if (!code || !nome) {
    throw new Error("Código e nome do serviço são obrigatórios.");
  }

  const service = new ProdutoService(client, input.tenantId);
  const ativo =
    !(input.values.status ?? "Ativo").toLowerCase().includes("inativ");

  if (input.decision === "ignore") {
    return { productId: input.existingId ?? "", action: "ignored" };
  }

  const tempoMin =
    input.values.tempo_estimado_minutos ??
    (input.values.tempo_padrao_h != null
      ? Math.round(input.values.tempo_padrao_h * 60)
      : null);

  const observacoes = [
    input.values.observacao_tecnica,
    input.values.tempo_padrao_h != null &&
    input.values.tempo_estimado_minutos == null
      ? `Tempo padrão: ${input.values.tempo_padrao_h}h`
      : null,
    input.values.garantia_dias != null
      ? `Garantia: ${input.values.garantia_dias} dias`
      : null,
    input.importRunId ? `import_run:${input.importRunId}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const serviceFields = {
    custo: input.values.custo ?? null,
    preco_sugerido: input.values.preco_sugerido ?? null,
    especialidade: input.values.especialidade ?? null,
    unidade_cobranca:
      input.values.unidade_cobranca ?? input.values.unidade ?? "UN",
    tempo_estimado_minutos: tempoMin,
  };

  if (input.decision === "update" && input.existingId) {
    await service.update(input.existingId, {
      nome,
      categoria: input.values.categoria ?? null,
      subcategoria: input.values.subcategoria ?? null,
      descricao_resumida: input.values.descricao_curta ?? null,
      preco_venda: input.values.preco_venda ?? null,
      unidade_medida: input.values.unidade ?? "UN",
      ativo,
      observacoes: observacoes || null,
      controla_estoque: false,
      ...serviceFields,
    });
    return { productId: input.existingId, action: "updated" };
  }

  const sku =
    input.decision === "duplicate_new_code"
      ? `${code}-IMP-${Date.now().toString(36).toUpperCase()}`
      : code;

  const created = await service.create({
    nome,
    tipo: "servico",
    sku,
    codigo_interno: code,
    categoria: input.values.categoria ?? null,
    subcategoria: input.values.subcategoria ?? null,
    descricao_resumida: input.values.descricao_curta ?? null,
    preco_venda: input.values.preco_venda ?? null,
    unidade_medida: input.values.unidade ?? "UN",
    ativo,
    observacoes: observacoes || null,
    controla_estoque: false,
    controla_lote: false,
    controla_serie: false,
    controla_validade: false,
    estoque_atual: 0,
    ...serviceFields,
  });

  return { productId: created.id, action: "created" };
}
