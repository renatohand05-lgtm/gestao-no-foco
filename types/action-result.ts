/** Resultado padronizado de Server Actions (Sprint 9.8). */

export type ActionResult =
  | { success: true; id?: string }
  | { success: false; error: string };
