# Fase 30.7 — Central de Automações Enterprise

## Objetivo

Módulo **Automações** interno: regras determinísticas, gatilhos com fonte de dados declarada, ações internas apenas, aprovação server-side, dry-run sem efeito persistente, idempotência e prevenção de loops — **sem WhatsApp, e-mail, webhook ou lançamentos financeiros automáticos**.

## Princípios

- Regra ≠ execução; simulação nunca persiste `persistedFinalAction`.
- Templates sempre `defaultActive: false`.
- Cross-tenant bloqueado em engine e dry-run.
- RBAC via `automacoes.*` no catálogo canônico.

## Arquitetura

```
page (RBAC + schema probe)
  → service / memory-store (tenant-scoped)
  → composeAutomationCentral (snapshot puro)
  → AutomacoesCentral (UI)
       → actions.ts (server actions + permissões)
            → engine / dry-run / approvals
```

| Camada | Path |
|--------|------|
| Types | `lib/automacoes/types.ts` |
| Triggers | `lib/automacoes/triggers.ts` |
| Actions catalog | `lib/automacoes/actions-catalog.ts` |
| Templates | `lib/automacoes/templates.ts` |
| Engine | `lib/automacoes/engine.ts` |
| Dry-run | `lib/automacoes/dry-run.ts` |
| Compose | `lib/automacoes/compose-central.ts` |
| UI | `components/automacoes/automacoes-central.tsx` |
| Página | `app/(app)/[tenant]/automacoes/page.tsx` |
| Migration | `supabase/migrations/20260821_phase30_7_automations.sql` |

## Builder (8 etapas)

Nome → Módulo → Gatilho → Condições → Ações → Aprovação → Simular → Revisar.

## Testes

- `test:phase30-automations` … `test:phase30-automation-dry-run`
- `test:homolog-30-7` (suites + browser QA)

## Evidência

`docs/testing/evidence/30-7/`
