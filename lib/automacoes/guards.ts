/**
 * Sprint 30.7 — Permissões automacoes.* (extensão do catálogo, sem bypass).
 */

export const AUTOMATION_PERMISSIONS = [
  "automacoes.visualizar",
  "automacoes.criar",
  "automacoes.editar",
  "automacoes.ativar",
  "automacoes.pausar",
  "automacoes.arquivar",
  "automacoes.simular",
  "automacoes.executar",
  "automacoes.aprovar",
  "automacoes.ver_historico",
  "automacoes.ver_auditoria",
  "automacoes.administrar",
] as const;

export type AutomationPermission = (typeof AUTOMATION_PERMISSIONS)[number];

export function hasAutomationPermission(
  permissions: readonly string[],
  required: AutomationPermission | AutomationPermission[],
): boolean {
  const need = Array.isArray(required) ? required : [required];
  return need.some((p) => permissions.includes(p));
}
