/**
 * Sprint 25.3 — Commit produtos + saldo inicial auditável.
 * Saldo nunca grava quantidade sem movimentação (entrada / origem importação).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { EstoqueService } from "@/lib/estoque/estoque-service";
import { ProdutoService } from "@/lib/produtos/produto-service";
import type { Database } from "@/types/database";
import type { DuplicateDecision } from "./duplicate-resolver.ts";

function asBool(v: unknown, fallback = true): boolean {
  if (v == null || v === "") return fallback;
  const s = String(v).trim().toLowerCase();
  if (["nao", "não", "false", "0", "n"].includes(s)) return false;
  if (["sim", "true", "1", "s", "yes"].includes(s)) return true;
  return fallback;
}

export type ProductStockImportValues = {
  sku?: string | null;
  codigo_interno?: string | null;
  codigo_barras?: string | null;
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  subcategoria?: string | null;
  marca?: string | null;
  fabricante?: string | null;
  unidade?: string | null;
  ncm?: string | null;
  cest?: string | null;
  custo_medio?: number | null;
  custo_reposicao?: number | null;
  preco_venda?: number | null;
  preco_minimo?: number | null;
  margem_alvo?: number | null;
  quantidade_atual?: number | null;
  estoque_minimo?: number | null;
  estoque_maximo?: number | null;
  estoque_seguranca?: number | null;
  deposito?: string | null;
  localizacao?: string | null;
  fornecedor_principal?: string | null;
  ativo?: unknown;
  controla_estoque?: unknown;
  tipo?: string | null;
};

export async function commitProductStockImportRow(
  client: SupabaseClient<Database>,
  input: {
    tenantId: string;
    userId: string;
    values: ProductStockImportValues;
    decision: DuplicateDecision;
    existingId?: string | null;
    importRunId?: string | null;
    allowNegativeStock?: boolean;
  },
): Promise<{
  productId: string;
  action: "created" | "updated" | "ignored";
  movementId: string | null;
}> {
  const nome = input.values.nome.trim();
  if (!nome) throw new Error("Nome do produto é obrigatório.");

  const tipoRaw = (input.values.tipo ?? "produto").toLowerCase();
  const tipo =
    tipoRaw === "servico" || tipoRaw === "serviço"
      ? "servico"
      : tipoRaw === "peca" || tipoRaw === "peça"
        ? "peca"
        : tipoRaw === "kit"
          ? "kit"
          : tipoRaw === "materia_prima" || tipoRaw === "matéria-prima"
            ? "materia_prima"
            : tipoRaw === "ativo_consumo" || tipoRaw === "consumo"
              ? "ativo_consumo"
              : "produto";

  const controlaEstoque =
    tipo === "servico" ? false : asBool(input.values.controla_estoque, true);
  const qty = Number(input.values.quantidade_atual ?? 0);
  if (tipo === "servico" && qty > 0) {
    throw new Error("Serviço não recebe saldo de estoque.");
  }
  if (!controlaEstoque && qty > 0) {
    throw new Error("Item sem controle de estoque não recebe saldo.");
  }
  if (qty < 0 && !input.allowNegativeStock) {
    throw new Error("Saldo negativo exige confirmação e permissão.");
  }

  if (input.decision === "ignore") {
    return {
      productId: input.existingId ?? "",
      action: "ignored",
      movementId: null,
    };
  }

  const produtos = new ProdutoService(client, input.tenantId);
  const observacoes = [
    input.values.deposito ? `Depósito: ${input.values.deposito}` : null,
    input.importRunId ? `import_run:${input.importRunId}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  let productId = input.existingId ?? null;
  let action: "created" | "updated" = "created";

  if (input.decision === "update" && productId) {
    await produtos.update(productId, {
      nome,
      sku: input.values.sku ?? null,
      codigo_interno: input.values.codigo_interno ?? null,
      codigo_barras: input.values.codigo_barras ?? null,
      categoria: input.values.categoria ?? null,
      subcategoria: input.values.subcategoria ?? null,
      marca: input.values.marca ?? null,
      fabricante: input.values.fabricante ?? null,
      unidade_medida: input.values.unidade ?? "UN",
      ncm: input.values.ncm ?? null,
      cest: input.values.cest ?? null,
      custo: input.values.custo_medio ?? null,
      custo_reposicao: input.values.custo_reposicao ?? null,
      preco_venda: input.values.preco_venda ?? null,
      preco_minimo: input.values.preco_minimo ?? null,
      margem_alvo: input.values.margem_alvo ?? null,
      estoque_minimo: input.values.estoque_minimo ?? null,
      estoque_maximo: input.values.estoque_maximo ?? null,
      estoque_seguranca: input.values.estoque_seguranca ?? null,
      localizacao: input.values.localizacao ?? null,
      fornecedor_principal: input.values.fornecedor_principal ?? null,
      ativo: asBool(input.values.ativo, true),
      controla_estoque: controlaEstoque,
      observacoes: observacoes || null,
      descricao_resumida: input.values.descricao ?? null,
    });
    action = "updated";
  } else {
    const created = await produtos.create({
      nome,
      tipo,
      sku: input.values.sku ?? null,
      codigo_interno: input.values.codigo_interno ?? null,
      codigo_barras: input.values.codigo_barras ?? null,
      categoria: input.values.categoria ?? null,
      subcategoria: input.values.subcategoria ?? null,
      marca: input.values.marca ?? null,
      fabricante: input.values.fabricante ?? null,
      unidade_medida: input.values.unidade ?? "UN",
      ncm: input.values.ncm ?? null,
      cest: input.values.cest ?? null,
      custo: input.values.custo_medio ?? null,
      custo_reposicao: input.values.custo_reposicao ?? null,
      preco_venda: input.values.preco_venda ?? null,
      preco_minimo: input.values.preco_minimo ?? null,
      margem_alvo: input.values.margem_alvo ?? null,
      estoque_atual: 0,
      estoque_minimo: input.values.estoque_minimo ?? null,
      estoque_maximo: input.values.estoque_maximo ?? null,
      estoque_seguranca: input.values.estoque_seguranca ?? null,
      localizacao: input.values.localizacao ?? null,
      fornecedor_principal: input.values.fornecedor_principal ?? null,
      ativo: asBool(input.values.ativo, true),
      controla_estoque: controlaEstoque,
      observacoes: observacoes || null,
      descricao_resumida: input.values.descricao ?? null,
    });
    productId = created.id;
    action = "created";
  }

  let movementId: string | null = null;
  if (controlaEstoque && qty > 0 && productId) {
    const estoque = new EstoqueService(client, input.tenantId);
    const mov = await estoque.createMovimentacao(
      {
        produto_id: productId,
        tipo: "entrada",
        quantidade: qty,
        origem: "importacao_saldo_inicial",
        motivo: "Saldo inicial via importação de catálogo/estoque",
        observacoes: [
          input.values.deposito ? `depósito=${input.values.deposito}` : null,
          input.values.localizacao
            ? `localização=${input.values.localizacao}`
            : null,
          input.importRunId ? `import_run=${input.importRunId}` : null,
          "kind=saldo_inicial",
        ]
          .filter(Boolean)
          .join("; "),
        custo_unitario_entrada: input.values.custo_medio ?? null,
      },
      input.userId,
    );
    movementId = mov.id;
  }

  return { productId: productId!, action, movementId };
}
