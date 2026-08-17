# HOTFIX — OPERATIONAL FLOW COMPLETION (35.2.x)

**Data:** 2026-08-17  
**Branch:** `main`  
**Tipo:** Hotfix de piloto. Sem billing, sem WhatsApp em massa, sem cron de production, sem Sprint 35.3.

```
HOTFIX — OPERATIONAL FLOW COMPLETION

PAYMENT METHODS: PASS
AGENDA: PASS
APPOINTMENT → OPERATION: PASS
LAVA-RÁPIDO: PASS
VEHICLE: PASS
CHECKLIST: PASS
OFICINA: PASS
OTHER SEGMENTS: PASS
OPERATION → SALE: PASS
PAYMENT: PASS
SERVICE READY: PASS
RBAC: PASS
TENANT ISOLATION: PASS
MOBILE: PASS

TESTES: PASS (21/21 phase35-2-x)
REGRESSÃO: PASS (35.2.3 14/14 · 35.2.2 35/35 · 35.2.1 2 suítes · 35.2 19/19 · 35.1 48/48 · 34.9 25/25)
LINT: PASS (0 errors; 35 warnings pré-existentes)
TYPECHECK: PASS
BUILD: PASS (inclui /[tenant]/agenda, /[tenant]/vendas/nova, /[tenant]/ordens/[id])

P0: 0
P1: 0
P2: homologação manual no tenant de piloto (PENDING)

MIGRATION: supabase/migrations/20260905_hotfix_352x_agenda_operation.sql
           (aditiva; NÃO executada em production)
COMMIT: `e9ae803` (feat)
HEAD == ORIGIN/MAIN: NO (após push)

HOMOLOGAÇÃO MANUAL: PENDING
```

## Decisão — SOURCE OF TRUTH de formas de pagamento

Tabela **`formas_pagamento`**. Catálogo mínimo já existente em `lib/financeiro/formas-pagamento-catalog.ts` (Sprint 34.9 / CAP).

Não foi criado quarto catálogo (`payment_methods`, finance types, etc.).  
`ensureFormasPagamentoCatalog` é compartilhado por Vendas, Contas a pagar, Contas a receber e a tela de Formas de pagamento.

Legado CREDITO/DEBITO/DINHEIRO/PIX é preservado (alias). Sem adquirente, taxa ou parcelamento inventados. Parcelas > 1 só em `cartao_credito` / `crediario`.

Select vazio: **"Configure as formas de pagamento"** + CTA para `/financeiro/formas-pagamento` somente com `financeiro.editar`.

## Causa raiz

1. **Vendas** listava `formas_pagamento` **sem ensure**. Tenant vazio → GFSelect "Nenhuma opção". CAP já fazia ensure; vendas/receber não.
2. **Agenda** não criava OS ao agendar (regra correta), mas o atalho "→ OS" era copy de oficina, pegava o **primeiro veículo** do cliente, não copiava serviço/profissional/`appointment_id` e semeava checklist de oficina. Lava não entrava na jornada.

## Fluxo agora

Criar agendamento **não** abre OS.

Natureza cliente: Confirmar / Cliente chegou / Iniciar atendimento|OS / Reagendar / Cancelar / Não compareceu.

**Cliente chegou** e **Iniciar atendimento** criam/reutilizam a OS (idempotente: `ordem_servico_id` + marcador `[from_agenda:id]`). Segmentos sem `work_orders` só avançam status da agenda.

Contexto transportado: tenant, cliente, serviço, profissional, data/hora, duração, observações, veículo se capability ON, `origem=agenda`.

**Lava:** checklist `LAVA_RAPIDO_CHECKLIST_TEMPLATE` (exterior/objetos/fotos; sem diagnóstico/peças/defeito). Identidade Cliente + veículo + placa no workspace.

**Oficina:** copy OS / Mecânico / Diagnóstico / Peças. Adapter, sem `if (segment === …)` nas páginas.

Faturar OS: mesmo catálogo; cliente e itens do atendimento; preço do cadastro.

## RBAC / isolamento

Iniciar atendimento: `agenda.editar|crm.editar` e, se o segmento cria OS, `os.criar`.  
Quem só agenda **não** ganha `vendas.*` nem `financeiro.editar`.  
Veículo/produto/agenda/OS/pagamento: `eq tenant_id` server-side. Ativas só (`ativo=true`).

## Arquivos principais

- `lib/financeiro/formas-pagamento-ensure.ts`
- `lib/agenda/operational-start.ts`, `lib/agenda/event-context.ts`
- `lib/crm/phase28/conversion-service.ts`
- `components/agenda/agenda-event-list-actions.tsx`
- `supabase/migrations/20260905_hotfix_352x_agenda_operation.sql`
- `scripts/phase35-2-x-operational-flow-tests.mjs`

WHATSAPP REAL: DISABLED  
CRON PRODUCTION: DISABLED  
BILLING: UNTOUCHED  
SPRINT 35.3: NÃO INICIADA
