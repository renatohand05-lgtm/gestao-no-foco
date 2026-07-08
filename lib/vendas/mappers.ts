import { calcItemMargem, calcItemTotal, calcVendaTotais } from "@/lib/vendas/format";
import type { VendaFormValues } from "@/lib/vendas/validations";
import type {
  CreateVendaInput,
  ProdutoOption,
  VendaDetail,
  VendaItemInput,
  VendaStatus,
} from "@/types/vendas";

export function normalizeVendaFormValues(
  values: VendaFormValues,
): CreateVendaInput {
  return {
    cliente_id: values.cliente_id,
    data_venda: values.data_venda,
    status: values.status as VendaStatus,
    desconto_total: values.desconto_total ?? 0,
    forma_pagamento: values.forma_pagamento?.trim() || null,
    observacoes: values.observacoes?.trim() || null,
    itens: values.itens.map((item) => ({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto: item.desconto ?? 0,
    })),
  };
}

export function vendaToFormValues(venda: VendaDetail): VendaFormValues {
  return {
    cliente_id: venda.cliente_id,
    data_venda: venda.data_venda.slice(0, 10),
    status: venda.status === "em_andamento" ? "em_andamento" : "orcamento",
    desconto_total: venda.desconto_total,
    forma_pagamento: venda.forma_pagamento ?? "",
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

  return {
    cliente_id: input.cliente_id,
    data_venda: input.data_venda,
    status: input.status ?? "orcamento",
    subtotal: totais.subtotal,
    desconto_total: input.desconto_total ?? 0,
    total: totais.total,
    margem_total: totais.margem_total,
    forma_pagamento: input.forma_pagamento ?? null,
    observacoes: input.observacoes ?? null,
    itemRows,
  };
}
