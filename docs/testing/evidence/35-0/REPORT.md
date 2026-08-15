# Sprint 35.0 — Arquitetura de segmentação do produto

**Data:** 2026-08-15  
**Branch:** `main`  
**Commit código:** `f6c81beace30a683ab9a3d8c1b018bfec208604c`  
**Tipo:** Fundação de produto — sem billing / Asaas / 35.1 / auto-migration prod

## Status

**SPRINT 35.0: GO** · homologação visual **PASS** · migration production **PASS**

## Decisão

Reuso de `tenants.segment` (já existia). Colunas aditivas: `segment_version`, `segment_config`. Motor central em `lib/segments/` (capabilities, não `if (segment === …)` espalhado). Tenant legado (`segment_version` nulo) mantém a UX atual.

## Gates (código)

| Gate | Resultado |
|---|---|
| `test:phase35-0-segment-architecture` | **13 PASS · 0 FAIL** |
| `test:phase34-2-p0-tenant-rls` | 12 PASS · 0 FAIL |
| `test:phase34-3-p1-mutation-auth` | 9 PASS · 0 FAIL |
| `test:phase34-4-access-journey` | 14 PASS · 0 FAIL |
| `test:phase34-5-pilot-ux` | 13 PASS · 0 FAIL |
| `test:phase34-6-ops-readiness` | 7 PASS · 0 FAIL |
| `test:phase34-7-reports-integrity` | 12 PASS · 0 FAIL |
| `test:phase34-8-release-candidate` | 8 PASS · 0 FAIL |
| `test:phase34-9-contas-pagar-beneficiarios` | PASS |
| `test:rbac` | PASS |
| `test:phase30-multisector-nav` | 14 PASS · 0 FAIL |
| `test:phase30-segment-config` | 36 PASS · 0 FAIL |
| `lint` | PASS (warnings pré-existentes) |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| `git diff --check` | PASS |

## Migration

Arquivo: `supabase/migrations/20260830_phase35_0_tenant_segment_config.sql`

- Aditiva (`ADD COLUMN IF NOT EXISTS`)
- Sem `DELETE` / `DROP TABLE`
- RPC `create_tenant_with_owner` mesma assinatura; tenants novos nascem com `segment_version = 1`
- **Production: PASS** (aplicada por Renato)

## Homologação manual

**HOMOLOGAÇÃO VISUAL 35.0: PASS**

### MIGRATION PRODUCTION: PASS

### TENANT LEGADO / OFICINA

- experiência anterior preservada: **PASS**
- Ordens de Serviço: **PASS**
- Mecânicos: **PASS**
- módulos automotivos preservados: **PASS**

### CONSULTORIA

- segmentação aplicada: **PASS**
- módulos automotivos ocultos: **PASS**
- Serviços: **PASS**
- Clientes: **PASS**
- Vendas: **PASS**
- Agenda: **PASS**
- CRM: **PASS**
- Financeiro: **PASS**
- Analytics / Relatórios: **PASS**

### CROSS-TENANT UX

- oficina ≠ consultoria: **PASS**

Sprint 35.1 **não** iniciada neste fechamento.
