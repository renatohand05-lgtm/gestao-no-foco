/**
 * Sprint 30.3 — Configuração automática por segmento (labels, módulos, KPIs…).
 * Templates de estrutura — não inserem dados reais.
 */

import {
  getEnterpriseSegment,
  type EnterpriseSegmentId,
} from "./segments.ts";

export type SegmentModuleKey =
  | "veiculos"
  | "ordens"
  | "equipe_tecnica"
  | "servicos"
  | "pecas"
  | "produtos"
  | "pedidos"
  | "clientes"
  | "equipe"
  | "caixa"
  | "cardapio"
  | "salao"
  | "cozinha"
  | "delivery"
  | "agenda"
  | "profissionais"
  | "projetos"
  | "contratos"
  | "horas"
  | "estoque"
  | "producao"
  | "financeiro"
  | "analytics";

export type SegmentSetup = {
  segmentId: EnterpriseSegmentId;
  labels: {
    workOrder: string;
    catalog: string;
    team: string;
    opsBoard: string;
  };
  modules: { key: SegmentModuleKey; label: string }[];
  menus: string[];
  cadastros: string[];
  fluxos: string[];
  kpis: string[];
  dashboards: string[];
  campos: string[];
};

type PartialSetup = Omit<SegmentSetup, "segmentId">;

const SETUPS: Record<EnterpriseSegmentId, PartialSetup> = {
  oficina: {
    labels: {
      workOrder: "Ordem de Serviço",
      catalog: "Serviços e Peças",
      team: "Mecânicos",
      opsBoard: "Quadro da oficina",
    },
    modules: [
      { key: "veiculos", label: "Veículos" },
      { key: "ordens", label: "OS" },
      { key: "equipe_tecnica", label: "Mecânicos" },
      { key: "servicos", label: "Serviços" },
      { key: "pecas", label: "Peças" },
      { key: "financeiro", label: "Financeiro" },
    ],
    menus: ["Centro de Operações", "Ordens de Serviço", "Mecânicos", "Produtos", "Clientes"],
    cadastros: ["Veículos", "Serviços", "Peças", "Clientes", "Mecânicos"],
    fluxos: ["Recepção → Diagnóstico → Execução → Entrega", "OS → Faturamento"],
    kpis: ["OS abertas", "Ticket médio", "Ocupação de boxes", "Margem de serviço"],
    dashboards: ["Operações", "Financeiro", "Comercial"],
    campos: ["placa", "modelo", "km", "mecanico", "checklist"],
  },
  auto_center: {
    labels: {
      workOrder: "Ordem de Serviço",
      catalog: "Serviços e Produtos",
      team: "Equipe técnica",
      opsBoard: "Quadro do Auto Center",
    },
    modules: [
      { key: "veiculos", label: "Veículos" },
      { key: "ordens", label: "OS" },
      { key: "servicos", label: "Serviços" },
      { key: "produtos", label: "Produtos" },
      { key: "equipe_tecnica", label: "Equipe técnica" },
    ],
    menus: ["Centro de Operações", "OS", "Serviços", "Estoque", "Clientes"],
    cadastros: ["Veículos", "Serviços", "Pneus/Produtos", "Clientes"],
    fluxos: ["Agendamento → Atendimento → OS → Entrega"],
    kpis: ["OS do dia", "Conversão de orçamento", "Giro de estoque"],
    dashboards: ["Operações", "Vendas", "Estoque"],
    campos: ["placa", "servico", "produto", "garantia"],
  },
  lava_rapido: {
    labels: {
      workOrder: "Atendimento",
      catalog: "Pacotes de lavagem",
      team: "Equipe",
      opsBoard: "Fila de boxes",
    },
    modules: [
      { key: "agenda", label: "Agenda" },
      { key: "ordens", label: "Atendimentos" },
      { key: "servicos", label: "Pacotes" },
      { key: "equipe", label: "Equipe" },
      { key: "caixa", label: "Caixa" },
    ],
    menus: ["Agenda", "Atendimentos", "Pacotes", "Caixa", "Clientes"],
    cadastros: ["Pacotes", "Boxes", "Clientes", "Equipe"],
    fluxos: ["Chegada → Box → Lavagem → Finalização"],
    kpis: ["Atendimentos/hora", "Ocupação de boxes", "Ticket médio"],
    dashboards: ["Operações", "Caixa"],
    campos: ["placa", "pacote", "box", "tempo"],
  },
  barbearia: {
    labels: {
      workOrder: "Atendimento",
      catalog: "Serviços e produtos",
      team: "Barbeiros",
      opsBoard: "Agenda da barbearia",
    },
    modules: [
      { key: "agenda", label: "Agenda" },
      { key: "profissionais", label: "Barbeiros" },
      { key: "servicos", label: "Serviços" },
      { key: "produtos", label: "Produtos" },
      { key: "clientes", label: "Clientes" },
      { key: "financeiro", label: "Financeiro" },
    ],
    menus: ["Agenda", "Clientes", "Serviços", "Produtos", "Financeiro"],
    cadastros: ["Serviços", "Profissionais", "Clientes", "Produtos"],
    fluxos: ["Agendamento → Atendimento → Comissão → Caixa"],
    kpis: ["Agenda do dia", "Ticket médio", "Comissões"],
    dashboards: ["Agenda", "Financeiro"],
    campos: ["horario", "profissional", "servico"],
  },
  clinica_estetica: {
    labels: {
      workOrder: "Atendimento",
      catalog: "Procedimentos e pacotes",
      team: "Profissionais",
      opsBoard: "Agenda da clínica",
    },
    modules: [
      { key: "agenda", label: "Agenda" },
      { key: "profissionais", label: "Profissionais" },
      { key: "servicos", label: "Procedimentos" },
      { key: "produtos", label: "Produtos" },
      { key: "clientes", label: "Clientes" },
      { key: "financeiro", label: "Financeiro" },
    ],
    menus: ["Agenda", "Clientes", "Procedimentos", "Estoque", "Financeiro"],
    cadastros: ["Procedimentos", "Pacotes", "Profissionais", "Clientes"],
    fluxos: ["Agendamento → Procedimento → Pacote/recorrência → Financeiro"],
    kpis: ["Agenda do dia", "Pacotes ativos", "Ticket médio"],
    dashboards: ["Agenda", "Financeiro"],
    campos: ["horario", "procedimento", "profissional"],
  },
  consultorio_odontologico: {
    labels: {
      workOrder: "Procedimento",
      catalog: "Procedimentos",
      team: "Profissionais",
      opsBoard: "Agenda do consultório",
    },
    modules: [
      { key: "agenda", label: "Agenda" },
      { key: "profissionais", label: "Profissionais" },
      { key: "servicos", label: "Procedimentos" },
      { key: "clientes", label: "Pacientes" },
      { key: "financeiro", label: "Financeiro" },
    ],
    menus: ["Agenda", "Pacientes", "Procedimentos", "Financeiro"],
    cadastros: ["Pacientes", "Procedimentos", "Profissionais"],
    fluxos: ["Agenda → Procedimento → Contas a receber"],
    kpis: ["Agenda do dia", "Receber", "Ticket médio"],
    dashboards: ["Agenda", "Financeiro"],
    campos: ["paciente", "procedimento", "horario"],
  },
  comercio: {
    labels: {
      workOrder: "Pedido",
      catalog: "Produtos",
      team: "Equipe",
      opsBoard: "Quadro da loja",
    },
    modules: [
      { key: "produtos", label: "Produtos" },
      { key: "pedidos", label: "Pedidos" },
      { key: "clientes", label: "Clientes" },
      { key: "equipe", label: "Equipe" },
      { key: "caixa", label: "Caixa" },
      { key: "estoque", label: "Estoque" },
    ],
    menus: ["Vendas", "Produtos", "Estoque", "Clientes", "Financeiro"],
    cadastros: ["Produtos", "Clientes", "Formas de pagamento", "Contas"],
    fluxos: ["Orçamento → Pedido → Pagamento → Entrega"],
    kpis: ["Vendas do dia", "Ticket médio", "Ruptura de estoque"],
    dashboards: ["Vendas", "Financeiro", "Estoque"],
    campos: ["sku", "preco", "estoque", "forma_pagamento"],
  },
  restaurante: {
    labels: {
      workOrder: "Pedido",
      catalog: "Cardápio",
      team: "Equipe",
      opsBoard: "Salão e produção",
    },
    modules: [
      { key: "cardapio", label: "Cardápio" },
      { key: "salao", label: "Salão" },
      { key: "cozinha", label: "Cozinha" },
      { key: "delivery", label: "Delivery" },
      { key: "caixa", label: "Caixa" },
    ],
    menus: ["Pedidos", "Cardápio", "Salão", "Delivery", "Caixa"],
    cadastros: ["Itens do cardápio", "Mesas", "Taxas delivery"],
    fluxos: ["Pedido → Cozinha → Entrega (salão/delivery)"],
    kpis: ["Pedidos abertos", "Tempo médio", "Ticket médio"],
    dashboards: ["Operações", "Caixa"],
    campos: ["mesa", "item", "observacao", "canal"],
  },
  servicos: {
    labels: {
      workOrder: "Ordem de Trabalho",
      catalog: "Serviços",
      team: "Profissionais",
      opsBoard: "Quadro de atendimentos",
    },
    modules: [
      { key: "agenda", label: "Agenda" },
      { key: "ordens", label: "Ordens" },
      { key: "profissionais", label: "Profissionais" },
      { key: "clientes", label: "Clientes" },
    ],
    menus: ["Agenda", "Ordens", "Profissionais", "Clientes", "Financeiro"],
    cadastros: ["Serviços", "Profissionais", "Clientes"],
    fluxos: ["Agendamento → Execução → Conclusão → Cobrança"],
    kpis: ["Agenda do dia", "Taxa de ocupação", "Ticket médio"],
    dashboards: ["Operações", "Comercial"],
    campos: ["horario", "profissional", "servico", "status"],
  },
  consultoria: {
    labels: {
      workOrder: "Projeto / Entrega",
      catalog: "Serviços",
      team: "Consultores",
      opsBoard: "Quadro de projetos",
    },
    modules: [
      { key: "projetos", label: "Projetos" },
      { key: "contratos", label: "Contratos" },
      { key: "horas", label: "Horas" },
      { key: "clientes", label: "Clientes" },
    ],
    menus: ["Projetos", "Clientes", "Financeiro", "Analytics"],
    cadastros: ["Clientes", "Contratos", "Tipos de serviço"],
    fluxos: ["Proposta → Contrato → Entregas → Faturamento"],
    kpis: ["Projetos ativos", "Horas do mês", "Receita recorrente"],
    dashboards: ["Executivo", "Financeiro"],
    campos: ["projeto", "horas", "contrato", "marco"],
  },
  distribuicao: {
    labels: {
      workOrder: "Pedido",
      catalog: "Produtos",
      team: "Equipe",
      opsBoard: "Expedição",
    },
    modules: [
      { key: "estoque", label: "Estoque" },
      { key: "pedidos", label: "Pedidos" },
      { key: "produtos", label: "Produtos" },
      { key: "clientes", label: "Clientes B2B" },
    ],
    menus: ["Pedidos", "Estoque", "Produtos", "Clientes", "Financeiro"],
    cadastros: ["Produtos", "Clientes", "Tabelas de preço"],
    fluxos: ["Pedido → Separação → Expedição → Faturamento"],
    kpis: ["Pedidos em aberto", "Fill rate", "Giro"],
    dashboards: ["Operações", "Estoque", "Financeiro"],
    campos: ["sku", "lote", "quantidade", "rota"],
  },
  pequena_industria: {
    labels: {
      workOrder: "Ordem interna",
      catalog: "Insumos e produtos",
      team: "Equipe",
      opsBoard: "Produção",
    },
    modules: [
      { key: "producao", label: "Produção" },
      { key: "estoque", label: "Insumos" },
      { key: "produtos", label: "Produtos acabados" },
      { key: "ordens", label: "Ordens internas" },
    ],
    menus: ["Produção", "Estoque", "Produtos", "Financeiro"],
    cadastros: ["Insumos", "Fichas técnicas", "Produtos"],
    fluxos: ["Demanda → Produção → Estoque → Venda"],
    kpis: ["Ordens em produção", "Custo de insumos", "Atraso"],
    dashboards: ["Operações", "Estoque"],
    campos: ["op", "insumo", "rendimento", "lote"],
  },
  outro: {
    labels: {
      workOrder: "Ordem",
      catalog: "Catálogo",
      team: "Equipe",
      opsBoard: "Quadro operacional",
    },
    modules: [
      { key: "clientes", label: "Clientes" },
      { key: "produtos", label: "Produtos/Serviços" },
      { key: "equipe", label: "Equipe" },
      { key: "financeiro", label: "Financeiro" },
      { key: "analytics", label: "Analytics" },
    ],
    menus: ["Dashboard", "Clientes", "Catálogo", "Financeiro"],
    cadastros: ["Clientes", "Itens", "Equipe"],
    fluxos: ["Cadastro → Operação → Financeiro"],
    kpis: ["Atividade do dia", "Receita", "Pendências"],
    dashboards: ["Executivo", "Financeiro"],
    campos: ["cliente", "item", "valor", "status"],
  },
};

export function getSegmentSetup(
  segment: string | null | undefined,
): SegmentSetup {
  const def = getEnterpriseSegment(segment);
  return { segmentId: def.id, ...SETUPS[def.id] };
}
