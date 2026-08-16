# Sprint 35.2 — Agenda + retornos + comunicação automática

**Data:** 2026-08-16  
**Branch:** `main`  
**Tipo:** Evolução da agenda existente + retornos previstos + outbox (DRY_RUN). Sem billing, sem WhatsApp real, sem cron production, sem migration production.

## Relatório pedido

```
SPRINT 35.2: GO

AGENDA CLIENTES: PASS
AGENDA NEGÓCIOS: PASS
DISPONIBILIDADE: PASS
CLIENTES AGENDADOS: PASS
RETORNO MANUAL: PASS
RETORNO POR SERVIÇO: PASS
OFICINA DATA: PASS
OFICINA KM: PASS
BARBEARIA: PASS
LAVA-RÁPIDO: PASS
ESTÉTICA: PASS
ODONTOLOGIA: PASS
CONSULTORIA: PASS
PAINEL RETORNOS: PASS
CENTRO OPERAÇÕES: PASS
HISTÓRICO: PASS
WHATSAPP ARCHITECTURE: PASS
WHATSAPP REAL: DISABLED / MANUAL PENDING
EMAIL: DRY_RUN
TEMPLATES: PASS
OUTBOX: PASS
IDEMPOTENCY: PASS
OPT-OUT: PASS
TIMEZONE: PASS
RBAC: PASS
TENANT ISOLATION: PASS
CROSS-TENANT: PASS
MOBILE: PARTIAL
MIGRATION: supabase/migrations/20260902_phase35_2_agenda_returns_notifications.sql
MIGRATION PRODUCTION: PENDING
CRON: PREPARED (/api/cron/retention + Bearer CRON_SECRET)
CRON PRODUCTION: DISABLED
NOVAS ENVS: NENHUMA obrigatória (opcional RETENTION_NOTIFY_MODE; CRON_SECRET já existia)
TESTES: phase35-2 19/19
REGRESSÃO: 35.1 48/48 · 35.0 13 · 34.2–34.9 PASS
RBAC: 92 PASS
LINT: 0 errors / 35 warnings (pré-existentes)
TYPECHECK: PASS
BUILD: PASS · /[tenant]/agenda/clientes, /[tenant]/crm/retornos, /api/cron/retention
P0: 0
P1: 0
P2: 2 (homologação visual; mobile nativo de retornos abre o portal)
COMMIT: (preenchido após commit)
HEAD == ORIGIN/MAIN: (após push)

HOMOLOGAÇÃO MANUAL: PENDING
```

## O que foi reusado

- `agenda_eventos` + conflito + recorrência + override com justificativa
- `agenda.*` RBAC + timezone `America/Sao_Paulo`
- Timeline `cliente_eventos` para histórico auditável
- `wa.me` (nunca DELIVERED)

## O que é novo

- Naturezas `cliente | negocio | interno` (origem + colunas opcionais)
- KPIs só de natureza cliente
- Painel `/agenda/clientes`
- `customer_returns` (não reserva horário)
- Regras opcionais por serviço
- Outbox + preferências / opt-out
- Templates por segmento; estética/odonto escondem procedimento
- Job DRY_RUN; cron preparado e **desligado** em production
- Seção “Retornos e fidelização” no Centro de Operações (não substitui card OS `retornos`)

## WhatsApp / e-mail

Default: DRY_RUN. Ação humana gera `wa.me` → `manual_opened`. Provider real **não** configurado.

## Rollback

Não aplicar migration/cron. Código degrada se tabelas faltarem. `RETENTION_NOTIFY_MODE=disabled` se necessário.

## Homologação (após migration em staging)

1. Tenant homologação: aplicar **somente** `20260902_phase35_2_agenda_returns_notifications.sql`.
2. Criar evento natureza cliente, negócio e bloqueio; confirmar KPI só conta cliente.
3. Tentar agendar em horário bloqueado → conflito; owner override com justificativa.
4. Serviço com duração → preenche minutos.
5. Criar retorno manual 15/30 dias; oficina com km.
6. Painel CRM → Retornos; Centro de Operações seção nova.
7. WhatsApp = abre wa.me, outbox `manual_opened` (não delivered).
8. Opt-out no cliente.
9. **Não** ligar cron Vercel. **Não** enviar para cliente real.
