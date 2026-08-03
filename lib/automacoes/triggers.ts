/**
 * Sprint 30.7 — Catálogo de gatilhos com fonte de dados real declarada.
 * Gatilho sem fonte → não entra no catálogo ativo.
 */

import type { AutomationModule, AutomationTriggerType } from "./types.ts";

export type TriggerDefinition = {
  type: AutomationTriggerType;
  module: AutomationModule;
  label: string;
  description: string;
  /** Fonte canônica existente — sem inventar. */
  dataSource: string;
  fields: readonly string[];
  enabled: boolean;
};

export const TRIGGER_CATALOG: readonly TriggerDefinition[] = [
  {
    type: "fin.conta_vencida",
    module: "financeiro",
    label: "Conta vencida",
    description: "Contas a receber/pagar com vencimento passado e em aberto.",
    dataSource: "lib/financeiro + aging / contas",
    fields: ["diasAtraso", "valor", "status"],
    enabled: true,
  },
  {
    type: "fin.conta_proxima_vencimento",
    module: "financeiro",
    label: "Conta próxima do vencimento",
    description: "Contas com vencimento nos próximos N dias.",
    dataSource: "lib/financeiro contas",
    fields: ["diasParaVencer", "valor"],
    enabled: true,
  },
  {
    type: "fin.caixa_projetado_negativo",
    module: "financeiro",
    label: "Caixa projetado negativo",
    description: "Projeção de caixa do Cash Intelligence < 0.",
    dataSource: "lib/finance/cash-intelligence",
    fields: ["saldoProjetado", "horizonteDias"],
    enabled: true,
  },
  {
    type: "fin.inadimplencia_acima_limite",
    module: "financeiro",
    label: "Inadimplência acima do limite",
    description: "Aging / inadimplência acima do limiar configurado.",
    dataSource: "financeiro.aging",
    fields: ["taxaInadimplencia", "limite"],
    enabled: true,
  },
  {
    type: "fin.despesa_acima_orcamento",
    module: "financeiro",
    label: "Despesa acima do orçamento",
    description: "Despesa do período vs orçamento aprovado.",
    dataSource: "financeiro.orcamento",
    fields: ["despesa", "orcamento", "percentual"],
    enabled: true,
  },
  {
    type: "fin.margem_abaixo_limite",
    module: "financeiro",
    label: "Margem abaixo do limite",
    description: "Margem/EBITDA do Analytics/FI abaixo do limiar.",
    dataSource: "lib/financial-intelligence + analytics",
    fields: ["margem", "limite"],
    enabled: true,
  },
  {
    type: "crm.lead_sem_retorno",
    module: "crm",
    label: "Lead sem retorno",
    description: "Lead sem interação há N dias.",
    dataSource: "lib/crm + cliente_tarefas / timeline",
    fields: ["diasSemContato", "responsavelId"],
    enabled: true,
  },
  {
    type: "crm.oportunidade_parada",
    module: "crm",
    label: "Oportunidade parada",
    description: "Oportunidade sem movimento no funil.",
    dataSource: "lib/crm/crm-funnel-service + premium stalled",
    fields: ["diasParada", "etapa", "valor"],
    enabled: true,
  },
  {
    type: "crm.followup_vencido",
    module: "crm",
    label: "Follow-up vencido",
    description: "Tarefa/follow-up com prazo vencido.",
    dataSource: "lib/crm/cliente-tarefa-service",
    fields: ["diasAtraso", "tarefaId"],
    enabled: true,
  },
  {
    type: "crm.proposta_proxima_validade",
    module: "crm",
    label: "Proposta próxima da validade",
    description: "Proposta com validade nos próximos N dias.",
    dataSource: "CRM propostas / oportunidades",
    fields: ["diasParaValidade", "propostaId"],
    enabled: true,
  },
  {
    type: "crm.cliente_sem_contato",
    module: "crm",
    label: "Cliente sem contato",
    description: "Cliente ativo sem contato recente.",
    dataSource: "CRM clientes + timeline",
    fields: ["diasSemContato", "clienteId"],
    enabled: true,
  },
  {
    type: "crm.oportunidade_perdida",
    module: "crm",
    label: "Oportunidade perdida",
    description: "Oportunidade marcada como perdida.",
    dataSource: "CRM funil status perdido",
    fields: ["motivo", "valor"],
    enabled: true,
  },
  {
    type: "ops.os_atrasada",
    module: "operacao",
    label: "OS atrasada",
    description: "Ordem de serviço além do prazo.",
    dataSource: "lib/operacoes / ordens",
    fields: ["diasAtraso", "osId"],
    enabled: true,
  },
  {
    type: "ops.os_parada",
    module: "operacao",
    label: "OS parada",
    description: "OS sem avanço de status.",
    dataSource: "lib/operacoes board",
    fields: ["diasParada", "osId"],
    enabled: true,
  },
  {
    type: "ops.recurso_indisponivel",
    module: "operacao",
    label: "Recurso indisponível",
    description: "Mecânico/recurso indisponível no Centro de Operações.",
    dataSource: "centro-operacoes / oficina",
    fields: ["recursoId", "motivo"],
    enabled: true,
  },
  {
    type: "ops.agenda_conflito",
    module: "operacao",
    label: "Agenda com conflito",
    description: "Sobreposição de compromissos na agenda.",
    dataSource: "lib/agenda",
    fields: ["eventoIds", "inicio"],
    enabled: true,
  },
  {
    type: "ops.tarefa_vencida",
    module: "operacao",
    label: "Tarefa vencida",
    description: "Tarefa operacional com prazo vencido.",
    dataSource: "tarefas / cliente_tarefas",
    fields: ["diasAtraso", "tarefaId"],
    enabled: true,
  },
  {
    type: "ops.capacidade_excedida",
    module: "operacao",
    label: "Capacidade excedida",
    description: "Carga acima da capacidade do recurso/equipe.",
    dataSource: "centro-operacoes capacidade",
    fields: ["carga", "capacidade"],
    enabled: true,
  },
  {
    type: "est.estoque_abaixo_minimo",
    module: "estoque",
    label: "Estoque abaixo do mínimo",
    description: "Saldo < mínimo do produto.",
    dataSource: "lib/estoque (leitura)",
    fields: ["saldo", "minimo", "produtoId"],
    enabled: true,
  },
  {
    type: "est.produto_zerado",
    module: "estoque",
    label: "Produto zerado",
    description: "Saldo igual a zero.",
    dataSource: "lib/estoque",
    fields: ["produtoId", "saldo"],
    enabled: true,
  },
  {
    type: "est.validade_proxima",
    module: "estoque",
    label: "Validade próxima",
    description: "Lote com validade nos próximos N dias.",
    dataSource: "estoque lotes (quando disponível)",
    fields: ["diasParaValidade", "loteId"],
    enabled: true,
  },
  {
    type: "compras.compra_atrasada",
    module: "compras",
    label: "Compra atrasada",
    description: "Pedido de compra além do prazo prometido.",
    dataSource: "lib/supply / compras",
    fields: ["diasAtraso", "pedidoId"],
    enabled: true,
  },
  {
    type: "compras.divergencia_recebimento",
    module: "compras",
    label: "Divergência no recebimento",
    description: "Recebimento com divergência de quantidade/valor.",
    dataSource: "supply recebimento",
    fields: ["pedidoId", "divergencia"],
    enabled: true,
  },
  {
    type: "compras.fornecedor_acima_lead_time",
    module: "compras",
    label: "Fornecedor acima do lead time",
    description: "Lead time real acima do esperado.",
    dataSource: "supply fornecedores",
    fields: ["leadTimeReal", "leadTimeEsperado"],
    enabled: true,
  },
  {
    type: "metas.meta_abaixo",
    module: "metas",
    label: "Meta abaixo do esperado",
    description: "Realizado vs meta abaixo do limiar.",
    dataSource: "metas / analytics targets",
    fields: ["percentual", "limite"],
    enabled: true,
  },
  {
    type: "metas.indicador_critico",
    module: "metas",
    label: "Indicador crítico",
    description: "KPI Health = crítico (Decision Center).",
    dataSource: "lib/analytics/decision-center",
    fields: ["metricId", "level"],
    enabled: true,
  },
  {
    type: "intel.risco_novo",
    module: "inteligencia",
    label: "Risco novo",
    description: "Novo risco no Decision Center / brief.",
    dataSource: "lib/analytics/decision-center",
    fields: ["riscoId", "impacto"],
    enabled: true,
  },
  {
    type: "intel.oportunidade_identificada",
    module: "inteligencia",
    label: "Oportunidade identificada",
    description: "Oportunidade no brief executivo.",
    dataSource: "lib/analytics/decision-center",
    fields: ["oportunidadeId"],
    enabled: true,
  },
  {
    type: "intel.kpi_mudou_status",
    module: "inteligencia",
    label: "KPI mudou de status",
    description: "Mudança de nível de saúde do KPI.",
    dataSource: "KPI Health",
    fields: ["metricId", "from", "to"],
    enabled: true,
  },
  {
    type: "tax.regra_proxima_vigencia",
    module: "tributario",
    label: "Regra próxima da vigência",
    description: "Regra tributária com vigência próxima.",
    dataSource: "lib/tax workflow",
    fields: ["diasParaVigencia", "regraId"],
    enabled: true,
  },
  {
    type: "tax.obrigacao_proxima",
    module: "tributario",
    label: "Obrigação próxima",
    description: "Obrigação fiscal com prazo próximo.",
    dataSource: "hub tributário",
    fields: ["diasParaPrazo", "obrigacaoId"],
    enabled: true,
  },
  {
    type: "tax.configuracao_incompleta",
    module: "tributario",
    label: "Configuração incompleta",
    description: "Configuração tributária incompleta no tenant.",
    dataSource: "tax configurar probe",
    fields: ["camposFaltantes"],
    enabled: true,
  },
] as const;

export function getTrigger(type: AutomationTriggerType): TriggerDefinition | undefined {
  return TRIGGER_CATALOG.find((t) => t.type === type);
}

export function triggersByModule(module: AutomationModule): TriggerDefinition[] {
  return TRIGGER_CATALOG.filter((t) => t.module === module && t.enabled);
}

export function triggerLabel(type: AutomationTriggerType): string {
  return getTrigger(type)?.label ?? type;
}
