/**
 * Sprint 30.3 — Templates iniciais por segmento.
 * Somente estrutura/catálogo — não inserem dados reais no banco.
 */

import {
  getEnterpriseSegment,
  type EnterpriseSegmentId,
} from "./segments.ts";

export type TemplateCategory =
  | "categorias"
  | "centros_custo"
  | "formas_pagamento"
  | "servicos"
  | "produtos"
  | "contas"
  | "indicadores"
  | "estoque"
  | "vendas"
  | "producao"
  | "delivery"
  | "salao"
  | "agenda"
  | "ordens"
  | "profissionais"
  | "projetos"
  | "contratos"
  | "horas"
  | "clientes";

export type OnboardingTemplateItem = {
  category: TemplateCategory;
  label: string;
  examples: string[];
};

export type SegmentTemplatePack = {
  segmentId: EnterpriseSegmentId;
  title: string;
  description: string;
  items: OnboardingTemplateItem[];
};

const PACKS: Record<EnterpriseSegmentId, Omit<SegmentTemplatePack, "segmentId">> = {
  oficina: {
    title: "Template Oficina",
    description: "Categorias, serviços, peças e indicadores típicos de oficina.",
    items: [
      { category: "categorias", label: "Categorias financeiras", examples: ["Receitas de serviço", "Peças", "Despesas operacionais"] },
      { category: "centros_custo", label: "Centros de custo", examples: ["Oficina", "Recepção", "Estoque"] },
      { category: "formas_pagamento", label: "Formas de pagamento", examples: ["Pix", "Cartão", "Boleto"] },
      { category: "servicos", label: "Serviços", examples: ["Revisão", "Freios", "Suspensão"] },
      { category: "produtos", label: "Produtos/Peças", examples: ["Filtro de óleo", "Pastilha", "Óleo 5W30"] },
      { category: "contas", label: "Contas", examples: ["Conta corrente", "Caixa"] },
      { category: "indicadores", label: "Indicadores", examples: ["OS abertas", "Ticket médio"] },
    ],
  },
  auto_center: {
    title: "Template Auto Center",
    description: "Serviços automotivos, estoque e indicadores de conversão.",
    items: [
      { category: "servicos", label: "Serviços", examples: ["Alinhamento", "Balanceamento", "Troca de óleo"] },
      { category: "produtos", label: "Produtos", examples: ["Pneu", "Bateria", "Filtro"] },
      { category: "estoque", label: "Estoque", examples: ["Pneus", "Lubrificantes"] },
      { category: "formas_pagamento", label: "Pagamentos", examples: ["Pix", "Cartão"] },
      { category: "indicadores", label: "Indicadores", examples: ["OS do dia", "Conversão"] },
    ],
  },
  lava_rapido: {
    title: "Template Lava Rápido",
    description: "Pacotes, agenda e caixa.",
    items: [
      { category: "servicos", label: "Pacotes", examples: ["Lavagem simples", "Completa", "Detailing"] },
      { category: "agenda", label: "Agenda", examples: ["Box 1", "Box 2"] },
      { category: "formas_pagamento", label: "Pagamentos", examples: ["Pix", "Dinheiro", "Cartão"] },
      { category: "indicadores", label: "Indicadores", examples: ["Atendimentos/hora"] },
    ],
  },
  comercio: {
    title: "Template Comércio",
    description: "Categorias, estoque, vendas e contas.",
    items: [
      { category: "categorias", label: "Categorias", examples: ["Vendas", "CMV", "Despesas"] },
      { category: "estoque", label: "Estoque", examples: ["Produto A", "Produto B"] },
      { category: "vendas", label: "Vendas", examples: ["Venda balcão", "Pedido"] },
      { category: "contas", label: "Contas", examples: ["Caixa", "Conta corrente"] },
      { category: "formas_pagamento", label: "Pagamentos", examples: ["Pix", "Cartão", "Fiado"] },
    ],
  },
  restaurante: {
    title: "Template Restaurante",
    description: "Categorias, produção, delivery e salão.",
    items: [
      { category: "categorias", label: "Categorias", examples: ["Food", "Bebidas", "Delivery"] },
      { category: "producao", label: "Produção", examples: ["Pratos", "Bebidas"] },
      { category: "delivery", label: "Delivery", examples: ["iFood", "Próprio"] },
      { category: "salao", label: "Salão", examples: ["Mesa 1", "Mesa 2"] },
      { category: "formas_pagamento", label: "Pagamentos", examples: ["Pix", "Cartão"] },
    ],
  },
  servicos: {
    title: "Template Serviços",
    description: "Agenda, ordens e profissionais.",
    items: [
      { category: "agenda", label: "Agenda", examples: ["Manhã", "Tarde"] },
      { category: "ordens", label: "Ordens", examples: ["Atendimento padrão"] },
      { category: "profissionais", label: "Profissionais", examples: ["Profissional 1"] },
      { category: "servicos", label: "Serviços", examples: ["Consulta", "Visita técnica"] },
    ],
  },
  consultoria: {
    title: "Template Consultoria",
    description: "Projetos, contratos, horas e clientes.",
    items: [
      { category: "projetos", label: "Projetos", examples: ["Diagnóstico", "Implementação"] },
      { category: "contratos", label: "Contratos", examples: ["Mensal", "Por escopo"] },
      { category: "horas", label: "Horas", examples: ["Hora técnica"] },
      { category: "clientes", label: "Clientes", examples: ["Cliente enterprise"] },
    ],
  },
  distribuicao: {
    title: "Template Distribuição",
    description: "Estoque, pedidos e contas B2B.",
    items: [
      { category: "estoque", label: "Estoque", examples: ["SKU A", "SKU B"] },
      { category: "vendas", label: "Pedidos", examples: ["Pedido B2B"] },
      { category: "contas", label: "Contas", examples: ["Conta operacional"] },
      { category: "categorias", label: "Categorias", examples: ["Receita atacado", "Frete"] },
    ],
  },
  pequena_industria: {
    title: "Template Pequena Indústria",
    description: "Produção, insumos e indicadores.",
    items: [
      { category: "producao", label: "Produção", examples: ["OP padrão"] },
      { category: "estoque", label: "Insumos", examples: ["Matéria-prima"] },
      { category: "produtos", label: "Acabados", examples: ["Produto final"] },
      { category: "indicadores", label: "Indicadores", examples: ["OPs abertas"] },
    ],
  },
  outro: {
    title: "Template Genérico",
    description: "Base mínima adaptável a qualquer negócio.",
    items: [
      { category: "categorias", label: "Categorias", examples: ["Receitas", "Despesas"] },
      { category: "contas", label: "Contas", examples: ["Conta principal"] },
      { category: "clientes", label: "Clientes", examples: ["Cliente padrão"] },
      { category: "formas_pagamento", label: "Pagamentos", examples: ["Pix", "Transferência"] },
    ],
  },
};

export function getSegmentTemplatePack(
  segment: string | null | undefined,
): SegmentTemplatePack {
  const def = getEnterpriseSegment(segment);
  return { segmentId: def.id, ...PACKS[def.id] };
}

export function listTemplateCategories(
  segment: string | null | undefined,
): TemplateCategory[] {
  return getSegmentTemplatePack(segment).items.map((i) => i.category);
}
