# Sprint 28.8 — Baseline (pré-alterações de estabilização)

Capturado em: 2026-08-01 (sessão local)  
Nenhuma alteração descartada. Working tree preservado.

## Git

| Campo | Valor |
|-------|-------|
| Branch | `main` (tracking `origin/main`) |
| Commit HEAD | `d577ddd` — `feat(enterprise): concluir Sprint 27.8 Enterprise Runtime` |
| Staged | 0 |
| Working tree | sujo (Fase 28 completa + 28.7 + estabilização 28.8 em curso) |

### `git log --oneline -5`

```
d577ddd feat(enterprise): concluir Sprint 27.8 Enterprise Runtime
2d40c6b feat(tax): concluir Fase 26 Enterprise Tax homologada em runtime
73a2718 feat(intelligence): complete enterprise intelligence phase 27
bdb749d feat(platform): enterprise visual identity milestone v26.2.1
81c2c11 feat(ui): premium experience milestone v25.7 checkpoint
```

### Arquivos modificados (tracked) — 21

```
M  app/(app)/[tenant]/clientes/funil/page.tsx
M  app/(app)/[tenant]/compras/indicadores/page.tsx
M  app/(app)/[tenant]/crm/indicadores/page.tsx
M  app/(app)/[tenant]/estoque/page.tsx
M  components/crm/crm-enterprise-navigation.tsx
M  components/finance/finance-navigation.tsx
M  components/ordens/os-open-form.tsx
M  components/ordens/os-subnav.tsx
M  components/supply/purchase-orders-client.tsx
M  config/navigation.ts
M  lib/crm/actions.ts
M  lib/crm/enterprise/oportunidade-service.ts
M  lib/finance/shared/rbac-compat.ts
M  lib/finance/shared/types.ts
M  lib/ordens/actions.ts
M  lib/ordens/validations.ts
M  lib/rbac/permissions.ts
M  lib/rbac/role-permissions.ts
M  lib/rbac/types.ts
M  package.json
M  types/database.ts
```

`git diff --stat HEAD` (tracked): **21 files, +799 / −57** (baseline snapshot; pode crescer na 28.8).

### Arquivos novos relevantes (untracked, excl. `.next*`)

- Rotas: `agenda/`, `crm/leads|oportunidades|follow-ups/`, `estoque/abc|reposicao/`, `financeiro/aging|cfo|orcamento/`, `ordens/templates/`
- Libs: `lib/agenda/`, `lib/crm/phase28/`, `lib/estoque/abc/`, `lib/finance/aging|budget/`, `lib/ordens/work-order/`
- Migrations: `20260802_phase28_{crm_rbac_fields,work_order_tipo,agenda_resources,finance_budget}.sql`
- Scripts: `phase28-tests.mjs`, `merge-phase28-database-types.mjs`, `homolog-28-7-*`
- Evidence: `docs/testing/evidence/28/`, `28-7/`
- Docs: `PHASE_28_ENTERPRISE.md`, `PHASE_28_MIGRATIONS.md`, `PHASE_28_6_1_CRM_MIGRATION_FIX.md`

### Ruído a ignorar no commit futuro

- `.next/`, `.next-build-*`, logs de build/lint locais, caches Turbopack

## Migrations Fase 28 (estado declarado)

Aplicadas manualmente no projeto remoto (Sprint 28.7 homologou schema live):

1. `20260802_phase28_crm_rbac_fields.sql`
2. `20260802_phase28_work_order_tipo.sql`
3. `20260802_phase28_agenda_resources.sql`
4. `20260802_phase28_finance_budget.sql`

**Este sprint NÃO executa SQL remoto nem migrations.**

## Homologação prévia (28.7)

- Schema probe: 18 PASS
- Browser auth: 40 PASS / 0 FAIL, 39 screenshots, 0 UUID na amostra
- Classificação: APROVADO COM RESSALVAS

## Ressalvas técnicas ao iniciar 28.8

- Conversões server-side parciais / stubs
- Dual pipeline CRM (funil clientes × deals) — intencional
- CRUD fino orçamento e agenda incompletos
- `supabase gen types` sem token — merge manual em `types/database.ts`
- Dívida: centros de resultado sem UI; forecast sem rota
