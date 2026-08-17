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
}): Client360TabId[] {
  return CLIENT_360_TAB_IDS.filter((tab) => {
    if (tab === "executivo") return input.hasExecutivo;
    if (tab === "veiculos") return input.showVehicles;
    if (tab === "ordens") return input.showWorkOrders;
    return true;
  });
}

export function client360TabLabel(
  tab: Client360TabId,
  surface: Pick<Client360Surface, "workOrdersLabel" | "vehiclesLabel">,
): string {
  const labels: Record<Client360TabId, string> = {
    executivo: "Executivo",
    resumo: "Resumo",
    cadastro: "Cadastro",
    financeiro: "Financeiro",
    ordens: surface.workOrdersLabel,
    vendas: "Vendas",
    veiculos: surface.vehiclesLabel,
    timeline: "Timeline",
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
