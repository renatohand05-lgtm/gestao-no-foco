# Sprint 33.7 — Catálogo comercial + entitlements (sem cobrança real)

**ASAAS_ENV:** sandbox · **REAL_CHARGES:** OFF · **Mobile:** NÃO

## Catálogo

| Plano | Slug | amount_cents |
|-------|------|--------------|
| Essencial | essential | 27990 |
| Gestão (recomendado) | management | 47990 |
| Pro | pro | 74990 |
| Pro Plus + Consultoria | pro_plus_consulting | 349990 |

R$ 19,90 permanece homologação sandbox do plano `pilot`. **Não é preço comercial.**

## Resultado

- Catálogo comercial: GO (TS canônico + seed SQL idempotente, não aplicado)
- Entitlements: PREPARADO SEM ENFORCEMENT (CORE iguais; RBAC separado)
- Segurança de preço: GO (amount/currency do cliente rejeitados)
- Tenant isolation: GO (auth por slug + `tenant_id` do servidor)
- Sandbox regression 33.3–33.6: PASS
- Cobrança real: NO-GO
- Asaas production: NO-GO
- Testes 33.7: 11 pass / 0 fail
- typecheck: PASS
- lint: PASS
- production build: PASS

## Migration

`supabase/migrations/20260824_phase33_7_commercial_catalog.sql` — upsert idempotente.  
**Não executada.** Aplicar manualmente no SQL Editor. Não apaga `pilot`.

## Novas envs

NENHUMA

## Decisões comerciais pendentes

- Funcionalidades exatas por plano
- Limites por plano
- Política de upgrade / pró-rata
- Política de downgrade
- Trial/entrada Pro Plus
- Condições comerciais
- Anualidade / desconto anual
