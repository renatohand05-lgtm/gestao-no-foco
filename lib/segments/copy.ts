/**
 * Sprint 35.1 — Adapter de apresentação por segmento.
 * Entidade base (mecanicos / ordens_servico) permanece; UI não vaza oficina.
 */
import type { ProductSegmentId, ResolvedSegmentContext } from "./types.ts";
import {
  resolveSegmentContext,
  type ResolveSegmentInput,
} from "./resolve.ts";

export type SegmentUiCopy = {
  engine: boolean;
  productSegment: ProductSegmentId | null;
  /** Path interno sem slug, ex. /profissionais */
  professionalsListPath: "/oficina/mecanicos" | "/profissionais";
  professional: string;
  professionals: string;
  newProfessional: string;
  professionalsDescription: string;
  professionalsParentLabel: string;
  automotiveSpecialties: boolean;
  customer: string;
  customers: string;
  catalog: string;
  workOrder: string;
  workOrders: string;
  newWorkOrder: string;
  workOrdersHubTitle: string;
  workOrdersHubDescription: string;
  newWorkOrderDescription: string;
  openWorkOrdersLabel: string;
  inProgressWorkOrdersLabel: string;
  emptyWorkOrdersTitle: string;
  emptyWorkOrdersBody: string;
  workOrderDetailTitle: (numero: string | number) => string;
  assigneeLabel: string;
};

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
      customer: t.customer,
      customers: t.customers,
      catalog: t.catalog,
      workOrder: "Ordem de Serviço",
      workOrders: "Ordens de Serviço",
      newWorkOrder: "Nova OS",
      workOrdersHubTitle: "Central de Ordens de Serviço",
      workOrdersHubDescription: "Visão operacional das ordens",
      newWorkOrderDescription:
        "Identifique o cliente e o veículo — ou cadastre na hora",
      openWorkOrdersLabel: "OS abertas",
      inProgressWorkOrdersLabel: "OS em andamento",
      emptyWorkOrdersTitle: "Nenhuma ordem de serviço cadastrada",
      emptyWorkOrdersBody: "Abra a primeira OS para começar a operação.",
      workOrderDetailTitle: (n) => `OS #${n}`,
      assigneeLabel: t.professional || "Mecânico",
    };
  }

  const lava = id === "lava_rapido";
  const workOrder = t.workOrder || "Atendimento";
  const workOrders = lava ? "Atendimentos" : `${workOrder}s`;
  const newWorkOrder = lava ? "Novo atendimento" : `Novo ${workOrder.toLowerCase()}`;

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
    customer: t.customer,
    customers: t.customers,
    catalog: t.catalog,
    workOrder,
    workOrders,
    newWorkOrder,
    workOrdersHubTitle: lava ? "Atendimentos" : workOrders,
    workOrdersHubDescription: lava
      ? "Fila de lavagem, estética e checklist"
      : `Central de ${workOrders.toLowerCase()}`,
    newWorkOrderDescription: lava
      ? "Identifique o cliente e o veículo para abrir o atendimento"
      : `Abra um ${workOrder.toLowerCase()} para o cliente`,
    openWorkOrdersLabel: lava ? "Atendimentos em andamento" : `${workOrders} abertos`,
    inProgressWorkOrdersLabel: lava
      ? "Serviços em andamento"
      : `${workOrders} em andamento`,
    emptyWorkOrdersTitle: lava
      ? "Nenhum atendimento cadastrado"
      : `Nenhum ${workOrder.toLowerCase()} cadastrado`,
    emptyWorkOrdersBody: lava
      ? "Abra o primeiro atendimento para usar o checklist de entrada e saída."
      : `Abra o primeiro ${workOrder.toLowerCase()} para começar.`,
    workOrderDetailTitle: (n) =>
      lava ? `Atendimento #${n}` : `${workOrder} #${n}`,
    assigneeLabel: t.professional,
  };
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
  const unit = n === 1 ? copy.professional.toLowerCase() : copy.professionals.toLowerCase();
  return `${n} ${unit}`;
}
