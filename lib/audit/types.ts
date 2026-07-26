/**
 * Sprint 21.2 — Tipos centrais da plataforma de Auditoria Enterprise.
 * Domínio puro · orientado a eventos · sem React · sem persistência.
 */

export type ActorType =
  | "user"
  | "system"
  | "service"
  | "automation"
  | "anonymous"
  | "unknown";

export type AuditOrigin =
  | "ui"
  | "api"
  | "server_action"
  | "middleware"
  | "job"
  | "workflow"
  | "rbac"
  | "system"
  | "unknown";

export type AuditTargetType =
  | "user"
  | "role"
  | "permission"
  | "finance"
  | "payment"
  | "purchase"
  | "stock"
  | "os"
  | "crm"
  | "report"
  | "config"
  | "dashboard"
  | "tenant"
  | "session"
  | "other"
  | "none";

/** Contexto mínimo exigido para gravar auditoria. */
export type AuditContext = {
  tenantId: string;
  userId: string | null;
  actorType?: ActorType;
  role?: string | null;
  origin?: AuditOrigin;
  correlationId?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
  /** Placeholder — preenchido quando houver captura real. */
  ip?: string | null;
  /** Placeholder — preenchido quando houver captura real. */
  device?: string | null;
  module?: string | null;
  resource?: string | null;
};

/** Entrada parcial para o recorder / logger. */
export type AuditLogInput = {
  event: string;
  category?: string;
  severity?: string;
  description?: string;
  targetType?: AuditTargetType;
  targetId?: string | null;
  resource?: string | null;
  module?: string | null;
  metadata?: AuditMetadata;
  origin?: AuditOrigin;
  correlationId?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
  timestamp?: string | number | Date | null;
};

/** Metadata tipada e serializável. */
export type AuditMetadataValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: AuditMetadataValue }
  | AuditMetadataValue[];

export type AuditMetadata = {
  [key: string]: AuditMetadataValue;
};
/** Evento de auditoria normalizado (imutável em espírito). */
export type AuditEvent = {
  id: string;
  tenantId: string;
  userId: string | null;
  actorType: ActorType;
  role: string | null;
  timestamp: string;
  event: string;
  category: string;
  severity: string;
  targetType: AuditTargetType;
  targetId: string | null;
  resource: string | null;
  module: string | null;
  description: string;
  metadata: AuditMetadata;
  origin: AuditOrigin;
  correlationId: string | null;
  requestId: string | null;
  sessionId: string | null;
  ip: string | null;
  device: string | null;
};

export type AuditRecordResult =
  | { ok: true; event: AuditEvent }
  | { ok: false; error: string; code: AuditErrorCode };

export type AuditErrorCode =
  | "INVALID_CONTEXT"
  | "MISSING_TENANT"
  | "INVALID_EVENT"
  | "INVALID_CATEGORY"
  | "INVALID_SEVERITY"
  | "INVALID_INPUT";

/** Sink desacoplado — persistência futura. */
export type AuditSink = {
  write: (event: AuditEvent) => void | Promise<void>;
};

export type AuditTimelineGroupBy =
  | "day"
  | "hour"
  | "event"
  | "category"
  | "severity"
  | "module"
  | "user"
  | "tenant";

export type AuditTimelineGroup = {
  key: string;
  label: string;
  count: number;
  events: readonly AuditEvent[];
};

export type AuditExportFormat = "json" | "csv" | "timeline";

export type AuditExportResult = {
  format: AuditExportFormat;
  content: string;
  mimeType: string;
  filenameSuggestion: string;
  eventCount: number;
};
