# Fase 30.8 — Integration Hub Enterprise

## Objetivo

Módulo **Integrações** como **Integration Hub Enterprise**: marketplace catalog-only, API Center documentado, connection blueprints, webhook center mock, event bus, scheduler, logs, monitor e config — **sem I/O externo, sem credenciais persistidas e sem webhooks ativos**.

## Princípios

- Marketplace sempre `active: false` e `status: catalog`.
- API Center com `tokens: "planned"` — nunca tokens reais.
- Webhooks e eventos externos permanecem em mock/DLQ arquitetural.
- Circuit breaker `open_for_external`; feature flag `EXTERNAL_OFF`.
- Connection blueprints com `storesSecrets: false`.

## Arquitetura

```
page (RBAC + tenant)
  → getIntegrationHubAction
  → composeIntegrationHubSnapshot (puro / determinístico)
  → IntegrationHubView (UI tabs)
```

| Camada | Path |
|--------|------|
| Types | `lib/integracoes/types.ts` |
| Marketplace | `lib/integracoes/marketplace-catalog.ts` |
| API Center | `lib/integracoes/api-center.ts` |
| Connections | `lib/integracoes/connection-manager.ts` |
| Webhooks | `lib/integracoes/webhook-center.ts` |
| Event Bus | `lib/integracoes/event-bus.ts` |
| Scheduler | `lib/integracoes/scheduler.ts` |
| Observability | `lib/integracoes/observability.ts` |
| Compose | `lib/integracoes/compose-hub.ts` |
| Guards / RBAC | `lib/integracoes/guards.ts` |
| UI | `components/integracoes/integration-hub-view.tsx` |
| Página | `app/(app)/[tenant]/integracoes/page.tsx` |

## Abas do Hub

1. **Dashboard** — KPIs de arquitetura (ativas 0, pendentes = catálogo, health score).
2. **API Center** — 10 módulos internos documentados (Financeiro … Onboarding).
3. **Marketplace** — 48 entradas catalog-only (ERP, marketplaces, WhatsApp, e-mail, pagamento, bancos, fiscal, Google, Microsoft, webhook tech).
4. **Connections** — OAuth, API Key, Basic, Bearer, Webhook Secret, Refresh (sem secrets).
5. **Webhooks** — fila mock inbound/outbound/DLQ.
6. **Scheduler** — jobs arquiteturais (`executesExternally: false`).
7. **Event Bus** — histórico mock + capabilities (`externalDispatch: false`).
8. **Logs** — entradas tenant-scoped redacted.
9. **Monitor** — health, webhook, API, fila, workers.
10. **Config** — rate limit, timeout, retry, cache, concurrency, flags, circuit breaker.

## Garantias de snapshot

| Campo | Valor |
|-------|-------|
| `liveExternalCalls` | `false` |
| `credentialsStored` | `false` |
| `activeWebhooks` | `false` |

## Testes

- `test:phase30-integrations`
- `test:phase30-api-center`
- `test:phase30-webhooks`
- `test:phase30-eventbus`
- `test:phase30-monitor`
- `test:homolog-30-8`

## Evidência

`docs/testing/evidence/30-8/`
