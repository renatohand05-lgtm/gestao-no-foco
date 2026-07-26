/**
 * Sprint 21.2 — Níveis de severidade de auditoria.
 */

export const AUDIT_SEVERITIES = [
  "Trace",
  "Info",
  "Success",
  "Warning",
  "Error",
  "Critical",
] as const;

export type AuditSeverityId = (typeof AUDIT_SEVERITIES)[number];

export type AuditSeverityMeta = {
  id: AuditSeverityId;
  label: string;
  description: string;
  /** Ordem crescente de gravidade (0 = menor). */
  rank: number;
};

export const AUDIT_SEVERITY_CATALOG: readonly AuditSeverityMeta[] = [
  { id: "Trace", label: "Trace", description: "Detalhe fino / telemetria", rank: 0 },
  { id: "Info", label: "Info", description: "Informação operacional", rank: 1 },
  { id: "Success", label: "Sucesso", description: "Operação concluída com êxito", rank: 2 },
  { id: "Warning", label: "Alerta", description: "Atenção / mudança sensível", rank: 3 },
  { id: "Error", label: "Erro", description: "Falha operacional", rank: 4 },
  { id: "Critical", label: "Crítico", description: "Incidente crítico de segurança ou dados", rank: 5 },
] as const;

export const AUDIT_SEVERITY_BY_ID: ReadonlyMap<string, AuditSeverityMeta> =
  new Map(AUDIT_SEVERITY_CATALOG.map((s) => [s.id, s]));

export function isKnownAuditSeverity(id: string): id is AuditSeverityId {
  return AUDIT_SEVERITY_BY_ID.has(id);
}

export function getAuditSeverity(id: string): AuditSeverityMeta | undefined {
  return AUDIT_SEVERITY_BY_ID.get(id);
}

export function listAuditSeverities(): readonly AuditSeverityMeta[] {
  return AUDIT_SEVERITY_CATALOG;
}

export function compareAuditSeverity(a: string, b: string): number {
  const ra = AUDIT_SEVERITY_BY_ID.get(a)?.rank ?? -1;
  const rb = AUDIT_SEVERITY_BY_ID.get(b)?.rank ?? -1;
  return ra - rb;
}
