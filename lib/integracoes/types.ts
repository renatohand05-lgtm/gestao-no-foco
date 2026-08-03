/**
 * Sprint 30.8 — Contratos Integration Hub (somente arquitetura).
 * Nenhuma integração externa ativa · sem credenciais reais.
 */

export type IntegrationLifecycle =
  | "catalog"
  | "preparing"
  | "pending"
  | "disabled"
  | "error_simulated";

export type MarketplaceCategory =
  | "erp"
  | "marketplace"
  | "whatsapp"
  | "email"
  | "sms"
  | "pagamento"
  | "open_finance"
  | "bancos"
  | "fiscal"
  | "google"
  | "microsoft"
  | "webhook_tech";

export type MarketplaceEntry = {
  id: string;
  name: string;
  vendor: string;
  category: MarketplaceCategory;
  status: IntegrationLifecycle;
  description: string;
  /** Sempre false nesta sprint. */
  active: false;
  authExpected: AuthMethod;
  capabilities: readonly string[];
};

export type InternalApiEntry = {
  id: string;
  module: string;
  name: string;
  endpoint: string;
  version: string;
  /** Nunca "live" — endpoints são contratos, não rotas operacionais. */
  status: "documented" | "preparing" | "internal";
  documentation: string;
  tokens: "planned";
  rateLimit: string;
  environment: "sandbox" | "production_ready_arch";
  authExpected: "bearer_planned" | "session_rbac";
  /** Sempre false — não há rota HTTP operacional publicada. */
  operational: false;
};

export type AuthMethod =
  | "oauth"
  | "api_key"
  | "basic"
  | "bearer"
  | "webhook_secret"
  | "refresh_token"
  | "certificate_planned"
  | "protocol";

export type ConnectionBlueprint = {
  id: string;
  method: AuthMethod;
  label: string;
  scopesSupported: boolean;
  keyRotationSupported: boolean;
  /** Nunca armazena segredo real. */
  storesSecrets: false;
  notes: string;
};

export type WebhookDirection = "inbound" | "outbound";

export type WebhookMockRecord = {
  id: string;
  direction: WebhookDirection;
  status: "queued" | "delivered_mock" | "retry_mock" | "dlq_mock";
  topic: string;
  retries: number;
  createdAt: string;
  payloadPreview: string;
  headersPreview: Record<string, string>;
};

export type SchedulerJobMock = {
  id: string;
  name: string;
  schedule: string;
  priority: "baixa" | "media" | "alta";
  status: "idle" | "scheduled" | "running_mock" | "failed_mock" | "cancelled";
  concurrency: number;
  backoffMs: number;
  nextRunAt: string | null;
};

export type EventBusRecord = {
  id: string;
  kind: "internal" | "external_planned";
  name: string;
  status: "published_mock" | "consumed_mock" | "dlq_mock" | "replay_ready";
  idempotencyKey: string;
  createdAt: string;
};

export type IntegrationLogEntry = {
  id: string;
  area: "integracao" | "api" | "webhook" | "job" | "evento";
  level: "info" | "warn" | "error";
  message: string;
  latencyMs: number | null;
  tenantScoped: true;
  userId: string | null;
  createdAt: string;
  payloadRedacted: true;
};

export type MonitorMetric = {
  id: string;
  label: string;
  value: string;
  tone: "ok" | "warn" | "neutral";
};

export type ConfigKnob = {
  id: string;
  label: string;
  value: string;
  description: string;
  mutableInUi: false;
};

export type IntegrationHubSnapshot = {
  tenantId: string;
  generatedAt: string;
  liveExternalCalls: false;
  credentialsStored: false;
  activeWebhooks: false;
  dashboard: {
    statusGeral: "arquitetura_pronta";
    integracoesAtivas: number;
    integracoesPendentes: number;
    erros: number;
    ultimaSincronizacao: string | null;
    tempoMedioMs: number | null;
    filaEventos: number;
    healthScore: number;
    healthLabel: string;
  };
  marketplace: MarketplaceEntry[];
  apiCenter: InternalApiEntry[];
  connections: ConnectionBlueprint[];
  webhooks: WebhookMockRecord[];
  scheduler: SchedulerJobMock[];
  events: EventBusRecord[];
  logs: IntegrationLogEntry[];
  monitor: MonitorMetric[];
  config: ConfigKnob[];
};
