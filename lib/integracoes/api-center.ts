/**
 * Sprint 30.8 / 30.8.1 — API Center (contratos internos, sem rotas operacionais).
 */

import type { InternalApiEntry } from "./types.ts";

function api(
  partial: Omit<InternalApiEntry, "tokens" | "operational" | "authExpected"> & {
    authExpected?: InternalApiEntry["authExpected"];
  },
): InternalApiEntry {
  return {
    ...partial,
    tokens: "planned",
    operational: false,
    authExpected: partial.authExpected ?? "session_rbac",
  };
}

export const INTERNAL_API_CATALOG: readonly InternalApiEntry[] = [
  api({
    id: "api-financeiro",
    module: "Financeiro",
    name: "Financeiro API",
    endpoint: "/api/internal/financeiro/v1",
    version: "v1",
    status: "documented",
    documentation: "Contrato de leitura financeira — não operacional nesta fase.",
    rateLimit: "60/min (planejado)",
    environment: "sandbox",
  }),
  api({
    id: "api-crm",
    module: "CRM",
    name: "CRM API",
    endpoint: "/api/internal/crm/v1",
    version: "v1",
    status: "documented",
    documentation: "Pipeline, tarefas e clientes — contrato arquitetural.",
    rateLimit: "60/min (planejado)",
    environment: "sandbox",
  }),
  api({
    id: "api-estoque",
    module: "Estoque",
    name: "Estoque API",
    endpoint: "/api/internal/estoque/v1",
    version: "v1",
    status: "preparing",
    documentation: "Saldos e movimentações — em preparação.",
    rateLimit: "30/min (planejado)",
    environment: "sandbox",
  }),
  api({
    id: "api-agenda",
    module: "Agenda",
    name: "Agenda API",
    endpoint: "/api/internal/agenda/v1",
    version: "v1",
    status: "preparing",
    documentation: "Eventos e disponibilidade — arquitetura.",
    rateLimit: "60/min (planejado)",
    environment: "sandbox",
  }),
  api({
    id: "api-compras",
    module: "Compras",
    name: "Compras API",
    endpoint: "/api/internal/compras/v1",
    version: "v1",
    status: "preparing",
    documentation: "Pedidos e recebimento — arquitetura.",
    rateLimit: "30/min (planejado)",
    environment: "sandbox",
  }),
  api({
    id: "api-analytics",
    module: "Analytics",
    name: "Analytics API",
    endpoint: "/api/internal/analytics/v1",
    version: "v1",
    status: "documented",
    documentation: "KPIs e Decision Center — contrato.",
    rateLimit: "30/min (planejado)",
    environment: "sandbox",
  }),
  api({
    id: "api-automacoes",
    module: "Automações",
    name: "Automações API",
    endpoint: "/api/internal/automacoes/v1",
    version: "v1",
    status: "preparing",
    documentation: "Regras e dry-run — arquitetura.",
    rateLimit: "20/min (planejado)",
    environment: "sandbox",
  }),
  api({
    id: "api-equipe",
    module: "Equipe",
    name: "Equipe API",
    endpoint: "/api/internal/equipe/v1",
    version: "v1",
    status: "preparing",
    documentation: "Membros e convites — arquitetura.",
    rateLimit: "30/min (planejado)",
    environment: "sandbox",
  }),
  api({
    id: "api-dashboard",
    module: "Dashboard",
    name: "Dashboard API",
    endpoint: "/api/internal/dashboard/v1",
    version: "v1",
    status: "documented",
    documentation: "Cockpit executivo — contrato.",
    rateLimit: "60/min (planejado)",
    environment: "sandbox",
  }),
  api({
    id: "api-onboarding",
    module: "Onboarding",
    name: "Onboarding API",
    endpoint: "/api/internal/onboarding/v1",
    version: "v1",
    status: "preparing",
    documentation: "Templates e checklist — arquitetura.",
    rateLimit: "20/min (planejado)",
    environment: "sandbox",
  }),
] as const;

export function assertNoRealApiTokens(): boolean {
  return INTERNAL_API_CATALOG.every((a) => a.tokens === "planned");
}

export function assertApiCenterNonOperational(): boolean {
  return INTERNAL_API_CATALOG.every(
    (a) =>
      a.operational === false &&
      a.environment === "sandbox" &&
      a.status !== ("live" as never) &&
      a.endpoint.startsWith("/api/internal/"),
  );
}
