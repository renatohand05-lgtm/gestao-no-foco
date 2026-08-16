/**
 * Tipos de atendimento/OS por segmento — mesma coluna tipo_ordem.
 * Sem engine paralela.
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

export const LAVA_ATTENDANCE_OPTIONS: AttendanceTypeOption[] = [
  { value: "lava_rapido", label: "Lava-rápido" },
  { value: "atendimento_automotivo", label: "Atendimento automotivo" },
  { value: "lavagem_simples", label: "Lavagem simples" },
  { value: "lavagem_completa", label: "Lavagem completa" },
  { value: "lavagem_tecnica", label: "Lavagem técnica" },
  { value: "lavagem_premium", label: "Lavagem premium" },
  { value: "higienizacao_interna", label: "Higienização interna" },
  { value: "higienizacao_bancos", label: "Higienização de bancos" },
  { value: "polimento", label: "Polimento" },
  { value: "vitrificacao", label: "Vitrificação" },
  { value: "detalhamento", label: "Detalhamento" },
  { value: "estetica_automotiva", label: "Estética automotiva" },
  { value: "pacote_plano", label: "Pacote / plano" },
  { value: "outro_atendimento", label: "Outro atendimento" },
];

const LAVA_VALUES = new Set(LAVA_ATTENDANCE_OPTIONS.map((o) => o.value));

const OFICINA_OPTIONS: AttendanceTypeOption[] = WORK_ORDER_TIPOS.map(
  (key) => ({
    value: key,
    label: WORK_ORDER_TIPO_LABELS[key],
  }),
);

export const OFICINA_ATTENDANCE_OPTIONS = OFICINA_OPTIONS;

export function isLavaAttendanceType(value: string): boolean {
  return LAVA_VALUES.has(value);
}

export function attendanceOptionsForContext(
  ctx: Pick<ResolvedSegmentContext, "usesCapabilityEngine" | "productSegment">,
): AttendanceTypeOption[] {
  const segment = librarySegmentForContext(ctx);
  if (segment === "lava_rapido") return LAVA_ATTENDANCE_OPTIONS;
  return OFICINA_OPTIONS;
}

export function defaultAttendanceType(
  ctx: Pick<ResolvedSegmentContext, "usesCapabilityEngine" | "productSegment">,
): string {
  const segment = librarySegmentForContext(ctx);
  if (segment === "lava_rapido") return "lava_rapido";
  if (segment === "consultoria") return "consultoria";
  if (segment === "clinica_estetica") return "estetica";
  return "oficina";
}

export function resolveWorkOrderTemplateKey(tipo: string | null | undefined): WorkOrderTipo {
  const value = tipo?.trim() || "oficina";
  if (isLavaAttendanceType(value)) return "lava_rapido";
  return (WORK_ORDER_TIPOS as readonly string[]).includes(value)
    ? (value as WorkOrderTipo)
    : "oficina";
}

export function resolveWorkOrderTemplateForTipo(tipo: string | null | undefined) {
  return getWorkOrderTemplate(resolveWorkOrderTemplateKey(tipo));
}

export const ALLOWED_ATTENDANCE_TYPE_VALUES = [
  ...WORK_ORDER_TIPOS,
  ...LAVA_ATTENDANCE_OPTIONS.map((o) => o.value),
] as const;
