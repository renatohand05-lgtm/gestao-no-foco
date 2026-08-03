# Sprint 30.8 — Baseline Integration Hub Enterprise

**Data:** 2026-08-03
**Escopo:** arquitetura completa de integrações — **sem** I/O externo real.

## Reuso

| Asset | Path | Uso |
|-------|------|-----|
| Hub `/integracoes` | app + import-engine | Shell existente (import) |
| Connectors registry | `lib/import-engine/connectors` | Catalog stubs |
| Outbox / event-bus | `lib/enterprise` | Referência interna |
| Feature flags | `enterprise-feature-flags` | Mantém OFF |

## Entrega 30.8

Fachada `lib/integracoes` + UI premium: Dashboard, API Center, Marketplace, Connection Manager, Webhook Center, Scheduler, Event Bus, Logs, Monitor, Config — tudo **preparing/mock**.

## Restrições

- Sem SQL remoto / commit / push / deploy
- Sem chaves / webhooks ativos / chamadas externas
