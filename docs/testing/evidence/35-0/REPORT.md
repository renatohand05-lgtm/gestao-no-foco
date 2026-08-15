# Sprint 35.0 — Arquitetura de segmentação do produto

**Data:** 2026-08-15  
**Branch:** `main`  
**Tipo:** Fundação de produto — sem billing / Asaas / 35.1 / auto-migration prod

## Status

**SPRINT 35.0: GO (código)** · homologação **PENDING** · migration production **PENDING**

## Decisão

Reuso de `tenants.segment` (já existia). Colunas aditivas: `segment_version`, `segment_config`. Motor central em `lib/segments/` (capabilities, não `if (segment === …)` espalhado). Tenant legado (`segment_version` nulo) mantém a UX atual.

## Gates

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
- **Não aplicada em production**

## Homologação manual (Renato)

1. Aplicar a migration acima no projeto Supabase.
2. Criar empresa nova e escolher cada um dos 6 tipos de negócio.
3. Conferir sidebar: consultoria sem Mecânicos/estoque; barbearia sem nomenclatura de oficina; oficina igual ao atual em tenant legado.
4. Conferir mobile (membership `segmentId` nulo e preenchido).
5. Não iniciar Sprint 35.1 até este checklist.
