/** Matemática pura da meta no dashboard — testável sem path-alias. */

export function calcMetaAtingimento(
  realizado: number | null | undefined,
  meta: number | null | undefined,
): number | null {
  if (meta == null || meta <= 0) return null;
  if (realizado == null || !Number.isFinite(realizado)) return null;
  return realizado / meta;
}

export type MetaDashboardStatus =
  | "Superada"
  | "Em acompanhamento"
  | "Abaixo"
  | "Não cadastrada";

export function classifyMetaDashboardStatus(
  atingimento: number | null,
  meta: number | null,
): MetaDashboardStatus {
  if (meta == null || meta <= 0 || atingimento == null) return "Não cadastrada";
  if (atingimento >= 1) return "Superada";
  if (atingimento >= 0.85) return "Em acompanhamento";
  return "Abaixo";
}
