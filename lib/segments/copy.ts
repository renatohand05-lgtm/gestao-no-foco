/**
 * Sprint 35.1 — Adapter de apresentação por segmento.
 * Entidade base (mecanicos / ordens_servico) permanece; UI não vaza oficina.
 */
import type { ProductSegmentId, ResolvedSegmentContext } from "./types.ts";
import {
  hasCapability,
  resolveSegmentContext,
  type ResolveSegmentInput,
} from "./resolve.ts";
import { CATALOG_SEGMENT_SHORT_LABEL } from "./catalog-labels.ts";
import { librarySegmentForContext } from "./library-segment.ts";
import { specialtySuggestionsForSegment } from "./professional-specialties.ts";

export type SegmentUiCopy = {
  engine: boolean;
  productSegment: ProductSegmentId | null;
  professionalsListPath: "/oficina/mecanicos" | "/profissionais";
  professional: string;
  professionals: string;
  newProfessional: string;
  professionalsDescription: string;
  professionalsParentLabel: string;
  automotiveSpecialties: boolean;
  /** Diagnóstico/peças da oficina mecânica — não o lava-rápido. */
  automotiveWorkflow: boolean;
  showVehicles: boolean;
  customer: string;
  customers: string;
  catalog: string;
  workOrder: string;
  workOrders: string;
  workOrderShort: string;
  newWorkOrder: string;
  workOrdersHubTitle: string;
  workOrdersHubDescription: string;
  newWorkOrderDescription: string;
  openWorkOrdersLabel: string;
  inProgressWorkOrdersLabel: string;
  estimatedInProgressHint: string;
  emptyWorkOrdersTitle: string;
  emptyWorkOrdersBody: string;
  workOrderDetailTitle: (numero: string | number) => string;
  assigneeLabel: string;
  vehicleLabel: string;
  vehicleFilterPlaceholder: string;
  diagnosisLabel: string;
  waitingPartsLabel: string;
  ticketMedioWorkOrderLabel: string;
  faturamentoWorkOrderLabel: string;
  openByDayTitle: string;
  finalizedByDayTitle: string;
  byStatusTitle: string;
  byAssigneeTitle: string;
  byServiceTypeTitle: string;
  partsAppliedTitle: string;
  dashboardTitle: string;
  centralKpisAria: string;
  loadErrorTitle: string;
  loadingAria: string;
  boardDescriptionCanEdit: string;
  boardDescriptionReadOnly: string;
  statusLabels: Record<string, string>;
  boardColumnLabels: Record<string, string>;
  emptySalesTitle: string;
  emptySalesBody: string;
  openFormSectionDescription: string;
  workOrdersReportTitle: string;
  workOrdersReportDescription: string;
  emptyAssigneeBody: string;
  emptyAssigneeCta: string;
  billedByAssigneeTitle: string;
  billedByAssigneeDescription: string;
  missingVehicleLabel: string;
  alreadyBilledMessage: string;
  cannotBillCanceledMessage: string;
  headerSavedMessage: string;
  diagnosisSavedMessage: string;
  billedSuccessMessage: string;
  workspaceLoadingAria: string;
  diagnosisPlaceholder: string;
  diagnosisSectionTitle: string;
  diagnosisSectionDescription: string;
  workspaceTabLabels: Record<string, string>;
  importModuleTitle: string;
  importModuleDescription: string;
  importUploadTitle: string;
  importUploadHint: string;
  importHistoryDescription: string;
  importReviewDescription: string;
  connectorsOsName: string;
  openWorkOrderCta: string;
  operationTypeLabel: string;
  catalogSegmentShort: string;
  emptyCatalogTitle: string;
  emptyCatalogBody: string;
  compactVehicleVitals: boolean;
  professionalSpecialtySuggestions: string[];
  finalizeOnlyLabel: string;
  finalizeAndNotifyLabel: string;
  awaitingPickupTitle: string;
  registerPickupLabel: string;
  serviceReadySheetTitle: string;
  confirmAppointmentLabel: string;
  clientArrivedLabel: string;
  startAttendanceLabel: string;
  rescheduleAppointmentLabel: string;
  noShowLabel: string;
  createsWorkOrderFromAgenda: boolean;
};

const OFICINA_TAB_LABELS: Record<string, string> = {
  resumo: "Resumo",
  checklist: "Checklist",
  diagnostico: "Diagnóstico",
  orcamento: "Orçamento",
  aprovacao: "Aprovação",
  execucao: "Execução",
  financeiro: "Financeiro",
  entrega: "Entrega",
  historico: "Histórico",
  anexos: "Anexos",
  retorno: "Retorno",
};

const OFICINA_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  aguardando_diagnostico: "Aguardando diagnóstico",
  diagnostico_concluido: "Diagnóstico concluído",
  aguardando_orcamento: "Aguardando orçamento",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  parcialmente_aprovado: "Parcialmente aprovado",
  em_execucao: "Em execução",
  aguardando_peca: "Aguardando peça",
  aguardando_cliente: "Aguardando cliente",
  pronto_para_entrega: "Pronto para entrega",
  entregue: "Entregue",
  faturado: "Faturado",
  cancelado: "Cancelado",
  retorno: "Retorno",
  garantia: "Garantia",
};

function workOrderStartLabel(workOrder: string, oficinaUx: boolean): string {
  if (oficinaUx) return "Iniciar OS";
  if (workOrder.includes("/")) return `Iniciar ${workOrder}`;
  return `Iniciar ${workOrder.toLowerCase()}`;
}

const AGENDA_ACTION_LABELS = {
  confirmAppointmentLabel: "Confirmar",
  clientArrivedLabel: "Cliente chegou",
  rescheduleAppointmentLabel: "Reagendar",
  noShowLabel: "Não compareceu",
} as const;

function workOrdersPhrase(workOrder: string): string {
  if (workOrder.includes("/")) return workOrder;
  if (/s$/i.test(workOrder.trim())) return workOrder;
  return `${workOrder}s`;
}

function isResolved(
  input: ResolveSegmentInput | ResolvedSegmentContext,
): input is ResolvedSegmentContext {
  return (
    typeof input === "object" &&
    input !== null &&
    "usesCapabilityEngine" in input &&
    "terminology" in input
  );
}

export function getSegmentUiCopy(
  input: ResolveSegmentInput | ResolvedSegmentContext,
): SegmentUiCopy {
  const ctx = isResolved(input) ? input : resolveSegmentContext(input);
  const t = ctx.terminology;
  const id = ctx.productSegment;
  const engine = ctx.usesCapabilityEngine;
  const oficinaUx = !engine || id === "oficina" || id == null;
  const showVehicles = oficinaUx || hasCapability(ctx, "vehicles");
  const catalogShort =
    CATALOG_SEGMENT_SHORT_LABEL[librarySegmentForContext(ctx)] ?? "o seu negócio";

  if (oficinaUx) {
    return {
      engine,
      productSegment: id,
      professionalsListPath: "/oficina/mecanicos",
      professional: t.professional || "Mecânico",
      professionals: t.professionals || "Mecânicos",
      newProfessional: "Novo mecânico",
      professionalsDescription:
        "Cadastro, custos, disponibilidade e vínculo com OS",
      professionalsParentLabel: "Oficina",
      automotiveSpecialties: true,
      automotiveWorkflow: true,
      showVehicles: true,
      customer: t.customer,
      customers: t.customers,
      catalog: t.catalog,
      workOrder: "Ordem de Serviço",
      workOrders: "Ordens de Serviço",
      workOrderShort: "OS",
      newWorkOrder: "Nova OS",
      workOrdersHubTitle: "Central de Ordens de Serviço",
      workOrdersHubDescription: "Visão operacional das ordens",
      newWorkOrderDescription:
        "Identifique o cliente e o veículo — ou cadastre na hora",
      openWorkOrdersLabel: "OS abertas",
      inProgressWorkOrdersLabel: "OS em andamento",
      estimatedInProgressHint: "Valor estimado das OS em andamento.",
      emptyWorkOrdersTitle: "Nenhuma ordem de serviço cadastrada",
      emptyWorkOrdersBody: "Abra a primeira OS para começar a operação.",
      workOrderDetailTitle: (n) => `OS #${n}`,
      assigneeLabel: t.professional || "Mecânico",
      vehicleLabel: "Veículo",
      vehicleFilterPlaceholder: "Veículo (placa ou modelo)",
      diagnosisLabel: "Em diagnóstico",
      waitingPartsLabel: "Aguardando peças",
      ticketMedioWorkOrderLabel: "Ticket médio OS",
      faturamentoWorkOrderLabel: "Faturamento OS",
      openByDayTitle: "OS abertas por dia",
      finalizedByDayTitle: "OS finalizadas por dia",
      byStatusTitle: "OS por status",
      byAssigneeTitle: "OS por mecânico",
      byServiceTypeTitle: "OS por tipo de serviço",
      partsAppliedTitle: "Peças aplicadas nas OS do período",
      dashboardTitle: "Dashboard de OS",
      centralKpisAria: "Indicadores da Central de OS",
      loadErrorTitle: "Não foi possível carregar a Central de OS",
      loadingAria: "Carregando Central de Ordens de Serviço",
      boardDescriptionCanEdit:
        "Arraste os cartões entre etapas quando a regra permitir. Clique para abrir a OS.",
      boardDescriptionReadOnly:
        "Clique no cartão para abrir a OS. Sem permissão para alterar status pelo quadro.",
      statusLabels: OFICINA_STATUS_LABELS,
      boardColumnLabels: {
        entrada: "Entrada",
        diagnostico: "Diagnóstico",
        orcamento: "Orçamento",
        aprovacao: "Aguardando aprovação",
        pecas: "Aguardando peças",
        execucao: "Em execução",
        pronto: "Pronto para entrega",
        finalizado: "Finalizado",
      },
      emptySalesTitle: "Você ainda não registrou vendas ou OS faturadas",
      emptySalesBody: "Crie a primeira Ordem de Serviço para ver o movimento.",
      openFormSectionDescription:
        "Cliente existente, novo cliente ou busca por placa. Orçamento e peças vêm depois.",
      workOrdersReportTitle: "Ordens de serviço",
      workOrdersReportDescription:
        "OS por status e valores quando o módulo estiver em uso.",
      emptyAssigneeBody: "Nenhuma OS com mecânico atribuído ainda.",
      emptyAssigneeCta: "Abrir ordens",
      billedByAssigneeTitle: "Faturamento por mecânico",
      billedByAssigneeDescription: "OS faturadas",
      missingVehicleLabel: "sem placa",
      alreadyBilledMessage:
        "OS já faturada — segundo faturamento bloqueado.",
      cannotBillCanceledMessage: "Não é possível faturar OS cancelada.",
      headerSavedMessage: "Dados da OS salvos.",
      diagnosisSavedMessage: "Diagnóstico salvo.",
      billedSuccessMessage:
        "OS faturada. Venda e Contas a Receber geradas pelo motor atual.",
      workspaceLoadingAria: "Carregando workspace da OS",
      diagnosisPlaceholder: "Diagnóstico técnico",
      diagnosisSectionTitle: "Diagnóstico",
      diagnosisSectionDescription:
        "Não gera movimentação financeira. Ao salvar a partir de Rascunho, a OS avança Rascunho → Aguardando diagnóstico → Diagnóstico concluído.",
      workspaceTabLabels: OFICINA_TAB_LABELS,
      importModuleTitle: "Ordens de Serviço",
      importModuleDescription:
        "Ordens de serviço da oficina via Excel ou CSV.",
      importUploadTitle: "Enviar arquivo de ordens de serviço",
      importUploadHint:
        "Excel (.xlsx / .xls) ou CSV. Histórico e mapeamentos gravam no Supabase. OS — nenhuma ordem real é criada nesta etapa.",
      importHistoryDescription:
        "Últimas importações de ordens de serviço deste tenant.",
      importReviewDescription:
        "Confirme as linhas. Nesta fase, a confirmação regista as linhas em staging + histórico — a criação de OS reais será ligada aos services existentes numa sprint seguinte.",
      connectorsOsName: "Ordens de Serviço",
      openWorkOrderCta: "Abrir OS",
      operationTypeLabel: "Tipo de operação",
      catalogSegmentShort: catalogShort,
      emptyCatalogTitle: "Nenhum serviço cadastrado ainda.",
      emptyCatalogBody: `Comece com nosso catálogo sugerido para ${catalogShort} ou crie seu primeiro serviço manualmente.`,
      compactVehicleVitals: false,
      professionalSpecialtySuggestions: [],
      finalizeOnlyLabel: "Finalizar OS",
      finalizeAndNotifyLabel: "Finalizar e avisar cliente",
      awaitingPickupTitle: "Aguardando retirada",
      registerPickupLabel: "Registrar retirada",
      serviceReadySheetTitle: "Serviço concluído",
      ...AGENDA_ACTION_LABELS,
      startAttendanceLabel: "Iniciar OS",
      createsWorkOrderFromAgenda: true,
    };
  }

  const workOrder = t.workOrder || "Atendimento";
  const workOrders = workOrdersPhrase(workOrder);
  const workOrderLc = workOrder.toLowerCase();
  const workOrdersLc = workOrders.toLowerCase();
  const newWorkOrder = `Novo ${workOrderLc}`;

  return {
    engine,
    productSegment: id,
    professionalsListPath: "/profissionais",
    professional: t.professional,
    professionals: t.professionals,
    newProfessional: `Novo ${t.professional.toLowerCase()}`,
    professionalsDescription: `${t.professionals} da equipe — disponibilidade e custo`,
    professionalsParentLabel: "Equipe",
    automotiveSpecialties: false,
    automotiveWorkflow: false,
    showVehicles,
    customer: t.customer,
    customers: t.customers,
    catalog: t.catalog,
    workOrder,
    workOrders,
    workOrderShort: workOrder,
    newWorkOrder,
    workOrdersHubTitle: workOrders,
    workOrdersHubDescription: `Central de ${workOrdersLc}`,
    newWorkOrderDescription: showVehicles
      ? `Identifique o cliente e o veículo para abrir o ${workOrderLc}`
      : `Abra um ${workOrderLc} para o cliente`,
    openWorkOrdersLabel: `${workOrders} abertos`,
    inProgressWorkOrdersLabel: `${workOrders} em andamento`,
    estimatedInProgressHint: `Valor estimado dos ${workOrdersLc} em andamento.`,
    emptyWorkOrdersTitle: `Nenhum ${workOrderLc} cadastrado`,
    emptyWorkOrdersBody: showVehicles
      ? `Abra o primeiro ${workOrderLc} para usar o checklist de entrada e saída.`
      : `Abra o primeiro ${workOrderLc} para começar.`,
    workOrderDetailTitle: (n) => `${workOrder} #${n}`,
    assigneeLabel: t.professional,
    vehicleLabel: "Veículo",
    vehicleFilterPlaceholder: "Veículo (placa ou modelo)",
    diagnosisLabel: "Em análise",
    waitingPartsLabel: "Aguardando materiais",
    ticketMedioWorkOrderLabel: `Ticket médio`,
    faturamentoWorkOrderLabel: `Faturamento`,
    openByDayTitle: `${workOrders} abertos por dia`,
    finalizedByDayTitle: `${workOrders} finalizados por dia`,
    byStatusTitle: `${workOrders} por status`,
    byAssigneeTitle: `${workOrders} por ${t.professional.toLowerCase()}`,
    byServiceTypeTitle: `${workOrders} por tipo de serviço`,
    partsAppliedTitle: showVehicles
      ? `Itens aplicados nos ${workOrdersLc} do período`
      : `Itens aplicados no período`,
    dashboardTitle: `Dashboard de ${workOrders}`,
    centralKpisAria: `Indicadores de ${workOrders}`,
    loadErrorTitle: `Não foi possível carregar ${workOrdersLc}`,
    loadingAria: `Carregando ${workOrdersLc}`,
    boardDescriptionCanEdit: `Arraste os cartões entre etapas quando a regra permitir. Clique para abrir o ${workOrderLc}.`,
    boardDescriptionReadOnly: `Clique no cartão para abrir o ${workOrderLc}. Sem permissão para alterar status pelo quadro.`,
    statusLabels: {
      ...OFICINA_STATUS_LABELS,
      aguardando_diagnostico: "Aguardando análise",
      diagnostico_concluido: "Análise concluída",
      aguardando_peca: "Aguardando materiais",
    },
    boardColumnLabels: {
      entrada: "Entrada",
      diagnostico: "Análise",
      orcamento: "Orçamento",
      aprovacao: "Aguardando aprovação",
      pecas: "Aguardando materiais",
      execucao: "Em execução",
      pronto: "Pronto para entrega",
      finalizado: "Finalizado",
    },
    emptySalesTitle: "Você ainda não registrou vendas",
    emptySalesBody: "Cadastre a primeira venda para ver o movimento.",
    openFormSectionDescription: showVehicles
      ? `Cliente existente, novo cliente ou busca por placa. Orçamento vem depois.`
      : "Cliente existente ou novo. Orçamento vem depois.",
    workOrdersReportTitle: workOrders,
    workOrdersReportDescription: `${workOrders} por status e valores quando o módulo estiver em uso.`,
    emptyAssigneeBody: `Nenhum ${workOrderLc} com ${t.professional.toLowerCase()} atribuído ainda.`,
    emptyAssigneeCta: `Abrir ${workOrdersLc}`,
    billedByAssigneeTitle: `Faturamento por ${t.professional.toLowerCase()}`,
    billedByAssigneeDescription: `${workOrders} faturados`,
    missingVehicleLabel: "sem placa",
    alreadyBilledMessage: `${workOrder} já faturado — segundo faturamento bloqueado.`,
    cannotBillCanceledMessage: `Não é possível faturar ${workOrderLc} cancelado.`,
    headerSavedMessage: `Dados do ${workOrderLc} salvos.`,
    diagnosisSavedMessage: "Análise salva.",
    billedSuccessMessage:
      `${workOrder} faturado. Venda e Contas a Receber geradas pelo motor atual.`,
    workspaceLoadingAria: `Carregando ${workOrderLc}`,
    diagnosisPlaceholder: "Análise técnica",
    diagnosisSectionTitle: "Análise",
    diagnosisSectionDescription:
      `Não gera movimentação financeira. Ao salvar a partir de Rascunho, o ${workOrderLc} avança Rascunho → Aguardando análise → Análise concluída.`,
    workspaceTabLabels: {
      ...OFICINA_TAB_LABELS,
      diagnostico: "Análise",
    },
    importModuleTitle: workOrders,
    importModuleDescription: `Importar ${workOrdersLc} via Excel ou CSV.`,
    importUploadTitle: `Enviar arquivo de ${workOrdersLc}`,
    importUploadHint: `Excel (.xlsx / .xls) ou CSV. Histórico e mapeamentos gravam no Supabase. Nenhum ${workOrderLc} real é criado nesta etapa.`,
    importHistoryDescription: `Últimas importações de ${workOrdersLc} deste tenant.`,
    importReviewDescription: `Confirme as linhas. Nesta fase, a confirmação regista as linhas em staging + histórico — a criação de ${workOrdersLc} reais será ligada aos services existentes numa sprint seguinte.`,
    connectorsOsName: workOrders,
    openWorkOrderCta: `Abrir ${workOrderLc}`,
    operationTypeLabel:
      id === "lava_rapido" ? "Tipo de atendimento" : "Tipo de operação",
    catalogSegmentShort: catalogShort,
    emptyCatalogTitle: "Nenhum serviço cadastrado ainda.",
    emptyCatalogBody: `Comece com nosso catálogo sugerido para ${catalogShort} ou crie seu primeiro serviço manualmente.`,
    compactVehicleVitals: id === "lava_rapido",
    professionalSpecialtySuggestions: specialtySuggestionsForSegment(id),
    finalizeOnlyLabel: "Finalizar atendimento",
    finalizeAndNotifyLabel: "Finalizar e avisar cliente",
    awaitingPickupTitle: "Aguardando retirada",
    registerPickupLabel: "Registrar retirada",
    serviceReadySheetTitle: "Serviço concluído",
    ...AGENDA_ACTION_LABELS,
    startAttendanceLabel: workOrderStartLabel(workOrder, oficinaUx),
    createsWorkOrderFromAgenda: oficinaUx || hasCapability(ctx, "work_orders"),
  };
}

export type SegmentUiCopyClient = Omit<SegmentUiCopy, "workOrderDetailTitle">;

export function segmentCopyForClient(
  copy: SegmentUiCopy,
): SegmentUiCopyClient {
  const { workOrderDetailTitle, ...rest } = copy;
  void workOrderDetailTitle;
  return rest;
}

export function osSubnavFromCopy(copy: SegmentUiCopy) {
  return {
    professionals: copy.professionals,
    newWorkOrder: copy.newWorkOrder,
    professionalsListPath: copy.professionalsListPath,
  };
}

export function professionalsHref(tenantSlug: string, copy: SegmentUiCopy) {
  return `/${tenantSlug}${copy.professionalsListPath}`;
}

export function countProfessionalsLabel(n: number, copy: SegmentUiCopy): string {
  const unit =
    n === 1 ? copy.professional.toLowerCase() : copy.professionals.toLowerCase();
  return `${n} ${unit}`;
}

export function labelWorkOrderStatus(
  status: string,
  copy: Pick<SegmentUiCopy, "statusLabels">,
): string {
  return copy.statusLabels[status] ?? status;
}

export function labelBoardColumn(
  key: string,
  copy: Pick<SegmentUiCopy, "boardColumnLabels">,
): string {
  return copy.boardColumnLabels[key] ?? key;
}
