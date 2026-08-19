/**
 * Superfície do cliente 360 por capabilities/copy do Segment Engine.
 * Sem forks `if (segment === "clinica")` nas páginas.
 */
import { getSegmentUiCopy } from "./copy.ts";
import type { ResolveSegmentInput } from "./resolve.ts";

export type Client360Surface = {
  showVehicles: boolean;
  showWorkOrders: boolean;
  workOrdersLabel: string;
  workOrderLabel: string;
  workOrderShort: string;
  vehicleLabel: string;
  vehiclesLabel: string;
  emptyWorkOrders: string;
  compactVehicleVitals: boolean;
  automotiveWorkflow: boolean;
  salesLabel: string;
};

export function client360Surface(
  input: ResolveSegmentInput,
): Client360Surface {
  const ui = getSegmentUiCopy(input);
  return {
    showVehicles: ui.showVehicles,
    showWorkOrders: ui.createsWorkOrderFromAgenda,
    workOrdersLabel: ui.workOrders,
    workOrderLabel: ui.workOrder,
    workOrderShort: ui.workOrderShort,
    vehicleLabel: ui.vehicleLabel,
    vehiclesLabel: "Veículos",
    emptyWorkOrders: ui.emptyWorkOrdersTitle,
    compactVehicleVitals: ui.compactVehicleVitals,
    automotiveWorkflow: ui.automotiveWorkflow,
    salesLabel: ui.compactVehicleVitals ? "Compras" : "Vendas",
  };
}

export const CLIENT_360_TAB_IDS = [
  "executivo",
  "resumo",
  "cadastro",
  "financeiro",
  "ordens",
  "vendas",
  "veiculos",
  "timeline",
  "agenda",
  "tarefas",
  "retornos",
  "comunicacoes",
  "observacoes",
  "contatos",
  "documentos",
] as const;

export type Client360TabId = (typeof CLIENT_360_TAB_IDS)[number];

export function visibleClient360Tabs(input: {
  showVehicles: boolean;
  showWorkOrders: boolean;
  hasExecutivo: boolean;
  relationship?: "atendimento" | "negocio" | null;
  compactVehicleVitals?: boolean;
}): Client360TabId[] {
  const automotive = input.showVehicles && input.showWorkOrders;
  const tabs = CLIENT_360_TAB_IDS.filter((tab) => {
    if (tab === "executivo") {
      if (input.relationship === "atendimento") return false;
      return input.hasExecutivo;
    }
    if (tab === "veiculos") {
      if (input.relationship === "negocio") return false;
      return input.showVehicles;
    }
    if (tab === "ordens") {
      if (input.relationship === "negocio") return false;
      return input.showWorkOrders;
    }
    if (tab === "retornos") return input.relationship !== "negocio";
    if (tab === "tarefas" || tab === "contatos") {
      if (input.relationship === "atendimento") return false;
      return true;
    }
    return true;
  });
  if (!automotive || input.relationship === "negocio") return tabs;
  const order: Client360TabId[] = input.compactVehicleVitals
    ? [
        "resumo",
        "veiculos",
        "ordens",
        "agenda",
        "vendas",
        "retornos",
        "comunicacoes",
        "timeline",
        "cadastro",
        "financeiro",
        "observacoes",
        "documentos",
      ]
    : [
        "resumo",
        "veiculos",
        "ordens",
        "agenda",
        "financeiro",
        "retornos",
        "comunicacoes",
        "timeline",
        "cadastro",
        "vendas",
        "observacoes",
        "documentos",
      ];
  return [...order.filter((id) => tabs.includes(id)), ...tabs.filter((id) => !order.includes(id))];
}

export function client360TabLabel(
  tab: Client360TabId,
  surface: Pick<Client360Surface, "workOrdersLabel" | "vehiclesLabel" | "salesLabel">,
): string {
  const labels: Record<Client360TabId, string> = {
    executivo: "Executivo",
    resumo: "Resumo",
    cadastro: "Cadastro",
    financeiro: "Financeiro",
    ordens: surface.workOrdersLabel,
    vendas: surface.salesLabel,
    veiculos: surface.vehiclesLabel,
    timeline: "Histórico",
    agenda: "Agenda",
    tarefas: "Tarefas",
    retornos: "Retornos",
    comunicacoes: "Comunicações",
    observacoes: "Observações",
    contatos: "Contatos",
    documentos: "Documentos",
  };
  return labels[tab];
}

export function client360QuoteOriginLabel(
  origem: string,
  surface: Pick<Client360Surface, "showWorkOrders" | "workOrderShort">,
): string | null {
  if (origem === "venda") return "Venda";
  if (!surface.showWorkOrders) return null;
  return surface.workOrderShort;
}
