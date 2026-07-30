/**
 * Sprint 22.8 — Enterprise Data Connector interface + tipos.
 */
export type ConnectorStatus = "preparing" | "available" | "connected" | "disabled" | "error";

export type ConnectorAuthKind = "none" | "api_key" | "oauth2" | "webhook_secret" | "basic";

export type ConnectorAuthConfig = {
  kind: ConnectorAuthKind;
  /** Referência a secret armazenado (nunca o valor em claro). */
  secretRef?: string | null;
  scopes?: string[];
  expiresAt?: string | null;
};

export type ConnectorSyncCursor = {
  lastSyncAt: string | null;
  cursor: string | null;
  pageToken?: string | null;
};

export type ConnectorSyncResult = {
  success: boolean;
  importedRows: number;
  skippedRows: number;
  errors: string[];
  cursor: ConnectorSyncCursor;
  idempotencyKey: string;
};

export type ConnectorTestResult = {
  ok: boolean;
  latencyMs: number;
  message: string;
  checkedAt: string;
};

export type ConnectorHistoryEntry = {
  id: string;
  connectorId: string;
  tenantId: string;
  action: "test" | "sync" | "disconnect" | "error";
  status: "success" | "failed" | "skipped";
  message: string;
  rowsAffected: number;
  createdAt: string;
};

export type ConnectorObservability = {
  lastError: string | null;
  lastSyncAt: string | null;
  totalSyncs: number;
  totalRowsImported: number;
};

export type EnterpriseConnectorDefinition = {
  id: string;
  name: string;
  category: "rest_api" | "webhook" | "erp" | "banking" | "sales" | "service_orders";
  description: string;
  status: ConnectorStatus;
  vendor?: string | null;
  docsUrl?: string | null;
};

export type EnterpriseDataConnector = {
  definition: EnterpriseConnectorDefinition;
  tenantId: string;
  auth: ConnectorAuthConfig;
  config: Record<string, unknown>;
  status: ConnectorStatus;
  cursor: ConnectorSyncCursor;
  observability: ConnectorObservability;

  testConnection(): Promise<ConnectorTestResult>;
  sync(options?: { idempotencyKey?: string; full?: boolean }): Promise<ConnectorSyncResult>;
  normalize(raw: unknown): Record<string, unknown>[];
  disconnect(): Promise<void>;
  getHistory(limit?: number): Promise<ConnectorHistoryEntry[]>;
};

export type ConnectorRegistryEntry = EnterpriseConnectorDefinition & {
  preparingMessage: string;
};
