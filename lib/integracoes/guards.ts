/**
 * Sprint 30.8 — Permissões Integration Hub.
 */

export const INTEGRATION_PERMISSIONS = [
  "integracoes.visualizar",
  "integracoes.configurar",
  "integracoes.administrar",
  "api.visualizar",
  "api.documentar",
  "api.administrar",
  "webhook.visualizar",
  "webhook.configurar",
  "webhook.administrar",
  "scheduler.visualizar",
  "scheduler.configurar",
  "scheduler.administrar",
  "eventbus.visualizar",
  "eventbus.configurar",
  "eventbus.administrar",
  "logs.visualizar",
  "monitor.visualizar",
  "monitor.administrar",
] as const;

export type IntegrationPermission = (typeof INTEGRATION_PERMISSIONS)[number];

export function hasIntegrationPermission(
  permissions: readonly string[],
  required: IntegrationPermission | IntegrationPermission[],
): boolean {
  const need = Array.isArray(required) ? required : [required];
  return need.some((p) => permissions.includes(p));
}
