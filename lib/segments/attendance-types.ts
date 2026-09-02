/**
 * Tipos de atendimento/OS por segmento — mesma coluna tipo_ordem.
 * Sem engine paralela. Sem if(segment) na UI.
 */
import {
  WORK_ORDER_TIPOS,
  WORK_ORDER_TIPO_LABELS,
  getWorkOrderTemplate,
  type WorkOrderTipo,
} from "../ordens/work-order/templates.ts";
import { librarySegmentForContext } from "./library-segment.ts";
import type { ResolvedSegmentContext } from "./types.ts";

export type AttendanceTypeOption = {
  value: string;
  label: string;
};

export const OFICINA_ATTENDANCE_OPTIONS: AttendanceTypeOption[] = [
  { value: "oficina", label: "Oficina / Veículo" },
  { value: "manutencao_preventiva", label: "Manutenção preventiva" },
  { value: "manutencao_corretiva", label: "Manutenção corretiva" },
  { value: "revisao", label: "Revisão" },
  { value: "diagnostico", label: "Diagnóstico" },
  { value: "instalacao_automotiva", label: "Instalação automotiva" },
  { value: "servico_rapido", label: "Serviço rápido" },
];

export const LAVA_ATTENDANCE_OPTIONS: AttendanceTypeOption[] = [
  { value: "lava_rapido", label: "Lavagem" },
  { value: "higienizacao", label: "Higienização" },
  { value: "estetica_automotiva", label: "Estética automotiva" },
  { value: "detalhamento", label: "Detalhamento" },
  { value: "pacote_plano", label: "Pacote / plano" },
  { value: "outro_atendimento_automotivo", label: "Outro atendimento automotivo" },
];

const LAVA_VALUES = new Set([
  ...LAVA_ATTENDANCE_OPTIONS.map((o) => o.value),
  "lavagem",
  "lavagem_simples",
  "higienizacao_interna",
  "pacote",
  "outro_atendimento",
]);
const OFICINA_VALUES = new Set(OFICINA_ATTENDANCE_OPTIONS.map((o) => o.value));

const CONSULTORIA_OPTIONS: AttendanceTypeOption[] = [
  { value: "consultoria", label: "Consultoria" },
  { value: "servicos_gerais", label: "Serviços gerais" },
];

const ESTETICA_OPTIONS: AttendanceTypeOption[] = [
  { value: "estetica", label: "Estética" },
  { value: "servicos_gerais", label: "Serviços gerais" },
];

const BARBEARIA_OPTIONS: AttendanceTypeOption[] = [
  { value: "servicos_gerais", label: "Serviços gerais" },
];

const ODONTO_OPTIONS: AttendanceTypeOption[] = [
  { value: "servicos_gerais", label: "Atendimento" },
];

const RESTAURANTE_OPTIONS: AttendanceTypeOption[] = [
  { value: "salao", label: "Salão" },
  { value: "delivery", label: "Delivery" },
  { value: "retirada", label: "Retirada no balcão" },
];
const RESTAURANTE_VALUES = new Set(
  RESTAURANTE_OPTIONS.map((o) => o.value),
);

export function isLavaAttendanceType(value: string): boolean {
  return LAVA_VALUES.has(value);
}

export function attendanceOptionsForContext(
  ctx: Pick<ResolvedSegmentContext, "usesCapabilityEngine" | "productSegment">,
): AttendanceTypeOption[] {
  const segment = librarySegmentForContext(ctx);
  if (segment === "lava_rapido") return LAVA_ATTENDANCE_OPTIONS;
  if (segment === "consultoria") return CONSULTORIA_OPTIONS;
  if (segment === "clinica_estetica") return ESTETICA_OPTIONS;
  if (segment === "barbearia") return BARBEARIA_OPTIONS;
  if (segment === "consultorio_odontologico") return ODONTO_OPTIONS;
  if (segment === "restaurante") return RESTAURANTE_OPTIONS;
  return OFICINA_ATTENDANCE_OPTIONS;
}

export function defaultAttendanceType(
  ctx: Pick<ResolvedSegmentContext, "usesCapabilityEngine" | "productSegment">,
): string {
  const segment = librarySegmentForContext(ctx);
  if (segment === "lava_rapido") return "lava_rapido";
  if (segment === "consultoria") return "consultoria";
  if (segment === "clinica_estetica") return "estetica";
  if (segment === "barbearia" || segment === "consultorio_odontologico") {
    return "servicos_gerais";
  }
  if (segment === "restaurante") return "salao";
  return "oficina";
}

export function resolveWorkOrderTemplateKey(tipo: string | null | undefined): WorkOrderTipo {
  const value = tipo?.trim() || "oficina";
  if (isLavaAttendanceType(value)) return "lava_rapido";
  if (OFICINA_VALUES.has(value)) return "oficina";
  if (RESTAURANTE_VALUES.has(value)) return "servicos_gerais";
  return (WORK_ORDER_TIPOS as readonly string[]).includes(value)
    ? (value as WorkOrderTipo)
    : "oficina";
}

export function resolveWorkOrderTemplateForTipo(tipo: string | null | undefined) {
  return getWorkOrderTemplate(resolveWorkOrderTemplateKey(tipo));
}

export const ALLOWED_ATTENDANCE_TYPE_VALUES = [
  ...WORK_ORDER_TIPOS,
  ...OFICINA_ATTENDANCE_OPTIONS.map((o) => o.value),
  ...LAVA_ATTENDANCE_OPTIONS.map((o) => o.value),
  ...CONSULTORIA_OPTIONS.map((o) => o.value),
  ...ESTETICA_OPTIONS.map((o) => o.value),
  ...BARBEARIA_OPTIONS.map((o) => o.value),
  ...ODONTO_OPTIONS.map((o) => o.value),
  ...RESTAURANTE_OPTIONS.map((o) => o.value),
] as const;

export { WORK_ORDER_TIPO_LABELS };
