import { calcItemMargem, calcItemTotal, calcVendaTotais } from "@/lib/vendas/format";
import {
  LEGACY_FORMA_PAGAMENTO_TIPO_MAP,
} from "@/lib/vendas/constants";
import type { VendaFormValues } from "@/lib/vendas/validations";
import type {
  CreateVendaInput,
  FormaPagamentoOption,
  ProdutoOption,
  VendaDetail,
  VendaItemInput,
  VendaStatus,
} from "@/types/vendas";

export function resolveLegacyFormaPagamentoId(
  legacyValue: string | null | undefined,
  formas: FormaPagamentoOption[],
): string {
  if (!legacyValue) return "";

  const tipo =
    LEGACY_FORMA_PAGAMENTO_TIPO_MAP[legacyValue] ?? legacyValue;
  const match = formas.find((forma) => forma.tipo === tipo);

  return match?.id ?? "";
}

export function normalizeVendaFormValues(
  values: VendaFormValues,
): CreateVendaInput {
  return {
    cliente_id: values.cliente_id,
    data_venda: values.data_venda,
    status: values.status as VendaStatus,
    desconto_total: values.desconto_total ?? 0,
    forma_pagamento_id: values.forma_pagamento_id?.trim() || null,
    quantidade_parcelas: values.quantidade_parcelas ?? 1,
    categoria_financeira_id: values.categoria_financeira_id?.trim() || null,
    centro_custo_id: values.centro_custo_id?.trim() || null,
    observacoes: values.observacoes?.trim() || null,
    itens: values.itens.map((item) => ({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto: item.desconto ?? 0,
    })),
  };
}

export function vendaToFormValues(
  venda: VendaDetail,
  formas: FormaPagamentoOption[],
): VendaFormValues {
  const formaPagamentoId =
    venda.forma_pagamento_id ??
    resolveLegacyFormaPagamentoId(venda.forma_pagamento, formas);

  return {
    cliente_id: venda.cliente_id,
    data_venda: venda.data_venda.slice(0, 10),
    status: venda.status === "em_andamento" ? "em_andamento" : "orcamento",
    desconto_total: venda.desconto_total,
    forma_pagamento_id: formaPagamentoId,
    quantidade_parcelas: venda.quantidade_parcelas ?? 1,
    categoria_financeira_id: venda.categoria_financeira_id ?? "",
    centro_custo_id: venda.centro_custo_id ?? "",
    observacoes: venda.observacoes ?? "",
    itens: venda.itens.map((item) => ({
      produto_id: item.produto_id ?? "",
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto: item.desconto,
    })),
  };
}

export function buildVendaItemRows(
  itens: VendaItemInput[],
  produtos: Map<string, ProdutoOption>,
) {
  return itens.map((item, index) => {
    const produto = produtos.get(item.produto_id);

    if (!produto) {
      throw new Error("Produto não encontrado para um dos itens.");
    }

    const desconto = item.desconto ?? 0;
    const total = calcItemTotal(item.quantidade, item.preco_unitario, desconto);
    const margem = calcItemMargem(
      item.quantidade,
      item.preco_unitario,
      produto.custo,
      desconto,
    );

    return {
      tenant_id: "",
      venda_id: "",
      produto_id: produto.id,
      descricao: produto.nome,
      tipo_item: produto.tipo,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto,
      total,
      custo_unitario: produto.custo,
      margem,
      ordem: index,
    };
  });
}

export function buildVendaHeaderPayload(
  input: CreateVendaInput,
  produtos: Map<string, ProdutoOption>,
  formas: Map<string, FormaPagamentoOption>,
) {
  const itemRows = buildVendaItemRows(input.itens, produtos);
  const totais = calcVendaTotais(
    itemRows.map((item) => ({
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto: item.desconto,
      custo_unitario: item.custo_unitario,
    })),
    input.desconto_total ?? 0,
  );

  const forma = input.forma_pagamento_id
    ? formas.get(input.forma_pagamento_id)
    : null;

  return {
    cliente_id: input.cliente_id,
    data_venda: input.data_venda,
    status: input.status ?? "orcamento",
    subtotal: totais.subtotal,
    desconto_total: input.desconto_total ?? 0,
    total: totais.total,
    margem_total: totais.margem_total,
    forma_pagamento_id: input.forma_pagamento_id ?? null,
    forma_pagamento: forma?.nome ?? input.forma_pagamento ?? null,
    quantidade_parcelas: input.quantidade_parcelas ?? 1,
    categoria_financeira_id: input.categoria_financeira_id ?? null,
    centro_custo_id: input.centro_custo_id ?? null,
    observacoes: input.observacoes ?? null,
    itemRows,
  };
}
