/**
 * Sprint 22.5 — Import Engine (generic, module-agnostic).
 */

export type ImportFormat =
  | "csv"
  | "xlsx"
  | "xls"
  | "pdf"
  | "ofx"
  | "cnab"
  | "xml"
  | "unknown";

export type ImportCellValue = string | number | boolean | null | Date;

export type ImportRawRow = Record<string, ImportCellValue>;

export type ImportColumn = {
  key: string;
  label: string;
  index: number;
  sampleValues: string[];
};

export type ImportParseResult = {
  format: ImportFormat;
  fileName: string;
  columns: ImportColumn[];
  rows: ImportRawRow[];
  totalRows: number;
  emptyRowsRemoved: number;
  warnings: string[];
};

export type ImportFieldDef = {
  key: string;
  label: string;
  required: boolean;
  type: "string" | "number" | "date" | "currency" | "enum";
  enumValues?: string[];
};

export type ImportColumnMapping = Record<string, string | null>;

export type ImportMappingProfile = {
  id: string;
  tenantId: string;
  module: string;
  name: string;
  targetEntity: string;
  mapping: ImportColumnMapping;
  updatedAt: string;
  createdAt: string;
  /** Sprint 22.6 — perfis reutilizáveis (persistência + aprendizado). */
  description?: string | null;
  format?: string | null;
  isDefault?: boolean;
  transformations?: Record<string, unknown>;
  normalizations?: Record<string, unknown>;
  rules?: Record<string, unknown>;
  importCount?: number;
  lastUsedAt?: string | null;
  createdBy?: string | null;
};

export type ImportIssueSeverity = "error" | "warning";

export type ImportIssue = {
  row?: number;
  field?: string;
  code: string;
  severity: ImportIssueSeverity;
  message: string;
};

export type ImportNormalizedRow = {
  rowNumber: number;
  raw: ImportRawRow;
  values: Record<string, unknown>;
  issues: ImportIssue[];
  fingerprint: string;
};

export type ImportClassification = {
  rowNumber: number;
  categorySuggested: string | null;
  subcategorySuggested: string | null;
  costCenterSuggested: string | null;
  dreGroupSuggested: string | null;
  confidence: number;
  reason: string;
  status: "auto" | "low_confidence" | "unclassified" | "confirmed" | "edited";
};

export type ImportPreview = {
  format: ImportFormat;
  fileName: string;
  columns: ImportColumn[];
  unknownColumns: string[];
  totalRows: number;
  firstRows: ImportRawRow[];
  lastRows: ImportRawRow[];
  issues: ImportIssue[];
  warnings: string[];
  mapping: ImportColumnMapping;
  targetFields: ImportFieldDef[];
};

export type ImportReviewRow = {
  rowNumber: number;
  description: string;
  values: Record<string, unknown>;
  classification: ImportClassification;
  issues: ImportIssue[];
};

export type ImportCommitRequest = {
  tenantId: string;
  userId: string;
  module: string;
  targetEntity: string;
  fileName: string;
  format: ImportFormat;
  mapping: ImportColumnMapping;
  rows: ImportReviewRow[];
  /** Only rows with status confirmed/edited/auto (confidence ok) are imported */
  confirmedRowNumbers: number[];
};

export type ImportCommitResult = {
  imported: number;
  rejected: number;
  skipped: number;
  errors: ImportIssue[];
  durationMs: number;
  logId: string;
};

export type ImportHistoryOrigin = "upload" | "api" | "paste" | "webhook";

export type ImportHistoryEntry = {
  id: string;
  tenantId: string;
  userId: string;
  userLabel: string;
  module: string;
  fileName: string;
  format: ImportFormat;
  status: "preview" | "completed" | "failed" | "partial" | "rolled_back";
  totalRows: number;
  importedRows: number;
  rejectedRows: number;
  errorCount: number;
  durationMs: number | null;
  createdAt: string;
  errorsSample: string[];
  /** Como os dados chegaram até a engine (Fase 1: sempre "upload"). */
  origin?: ImportHistoryOrigin;
  /** Sprint 22.6 — persistência/aprendizado/rollback. */
  targetEntity?: string;
  profileId?: string | null;
  profileName?: string | null;
  engineVersion?: string;
  correlationId?: string | null;
  rolledBackAt?: string | null;
  rollbackBy?: string | null;
  mappingSnapshot?: Record<string, string | null>;
  /** Sprint 25.4.2 — lifecycle do histórico (soft). */
  archivedAt?: string | null;
  archivedBy?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
};

export type ImportFileLimits = {
  maxBytes: number;
  maxRows: number;
};

/** Teto genérico — limites por formato em `import-file-limits.ts`. */
export const DEFAULT_IMPORT_LIMITS: ImportFileLimits = {
  maxBytes: 25 * 1024 * 1024,
  maxRows: 50_000,
};

export const SUPPORTED_FORMATS: readonly ImportFormat[] = [
  "csv",
  "xlsx",
  "xls",
  "pdf",
  "ofx",
  "xml",
] as const;

/**
 * Sprint 22.5.1 — Consolidação: engine única, múltiplos módulos consumidores.
 * Cada módulo define seus próprios campos-alvo e regras de classificação,
 * mas compartilha parsing, segurança, mapeamento, revisão e histórico.
 */
export type ImportModuleId =
  | "finance"
  | "sales"
  | "service-orders"
  | "catalog"
  | "stock"
  | "invoice";

/* ————————————————— Segurança (Sprint 22.5.1) ————————————————— */

export type ImportSecurityIssueSeverity = "error" | "warning";

export type ImportSecurityIssue = {
  code: string;
  severity: ImportSecurityIssueSeverity;
  message: string;
};

export type ImportSecurityResult = {
  safe: boolean;
  issues: ImportSecurityIssue[];
  warnings: string[];
  detectedFormat: ImportFormat;
};

/* ————————————————— Classificação (Sprint 22.5.1) ————————————————— */

export type ClassificationDomain = ImportModuleId;

/* ————————————————— Rollback (Sprint 22.5.1 — arquitetura apenas) ————————————————— */

export type ImportRollbackStatus =
  | "not_supported"
  | "eligible"
  | "in_progress"
  | "done"
  | "failed";

export type ImportRollbackPlan = {
  logId: string;
  module: string;
  status: ImportRollbackStatus;
  affectedRows: number;
  reason: string;
  createdAt: string;
  /** Sprint 22.6 — itens elegíveis/afetados pelo plano de rollback. */
  items?: ImportRunItem[];
};

/* ————————————————— Aprendizado (Sprint 22.6) ————————————————— */

export type ImportLearningRuleSource =
  | "seed"
  | "user_confirm"
  | "user_edit"
  | "auto_learned";

export type ImportLearningRule = {
  id: string;
  tenantId: string;
  module: string;
  /** Fingerprint normalizado da descrição confirmada (ver `learning/learning-store.ts`). */
  ruleKey: string;
  patterns: string[];
  categorySuggested: string | null;
  subcategorySuggested: string | null;
  costCenterSuggested: string | null;
  dreGroupSuggested: string | null;
  supplierSuggested: string | null;
  confidence: number;
  reason: string;
  source: ImportLearningRuleSource;
  hitCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/* ————————————————— Rollback: itens por run (Sprint 22.6) ————————————————— */

export type ImportRunItemRollbackStatus =
  | "pending"
  | "reverted"
  | "skipped"
  | "failed";

export type ImportRunItem = {
  id: string;
  tenantId: string;
  runId: string;
  rowNumber: number;
  targetType: string;
  targetId: string;
  operation: string;
  payloadSnapshot: Record<string, unknown> | null;
  rollbackStatus: ImportRunItemRollbackStatus;
  createdAt: string;
};

/* ————————————————— Confiança do mapeamento (Sprint 22.6) ————————————————— */

export type ImportMappingConfidenceStatus =
  | "recognized"
  | "needs_confirmation"
  | "unrecognized";

export type ImportMappingConfidence = {
  fieldKey: string;
  sourceColumn: string | null;
  confidence: number;
  status: ImportMappingConfidenceStatus;
};
