# Sprint 25.7.4 — Correção final RBAC Dashboard Executivo

**Classificação:** APROVADO · 0 FAIL  
**Encerramento:** Sprint 25 (etapa UI/RBAC executivo)

## Causa raiz

1. O guard do Dashboard Executivo aceitava **any-of** incluindo só `analytics.visualizar`, o que liberava papéis operacionais indevidamente.
2. Faltava fonte única e guards nomeados (`requireAnalyticsPermission`) alinhados a `requirePermission` / `requireAnyPermission`.
3. Papel `operacoes` ainda tinha `dashboard.executivo` no catálogo `ROLE_PERMISSIONS`.
4. Membership `owner`/`admin` dependia de bridges duplicadas por domínio (já mitigado em 25.7.3; consolidado aqui).

## Arquivos corrigidos / criados

| Arquivo | Papel |
|---------|--------|
| `lib/rbac/membership.ts` | Fonte única Owner→`proprietario`, Admin→`diretor` |
| `lib/rbac/executive-access.ts` | `EXECUTIVE_DASHBOARD_ANY_OF`, `requireAnalyticsPermission` |
| `lib/rbac/role-permissions.ts` | Remove executivo de `operacoes` |
| `lib/analytics/analytics-actions.ts` | Gate executivo via `requireAnalyticsPermission` |
| `lib/analytics/rbac-compat.ts` | Usa membership compartilhado + aliases legados |
| `lib/finance/shared/rbac.ts` | `requireFinancePermission` (alias) |
| `config/navigation.ts` | Metadata `requiredAnyPermissions` alinhada |

## Matriz validada

| Perfil | Resultado |
|--------|-----------|
| **Owner** (`owner`→`proprietario`) | ALLOW total executivo |
| **Admin** (`admin`→`diretor`) | ALLOW conforme RBAC (catálogo diretor) |
| **Financeiro** | ALLOW executivo (chaves no catálogo financeiro) |
| **Operacional** (`operacoes`) | DENY executivo; mantém `analytics.visualizar` de área |

Gate executivo canónico (não bypass):

`analytics.executivo` **|** `dashboard.executivo`

`analytics.visualizar` **sozinho não libera** o Dashboard Executivo.

## Validação

| Check | Resultado |
|-------|-----------|
| lint | OK |
| build | OK |
| `test:executive-rbac-final` | 31 PASS · 0 FAIL |
| `test:analytics-owner-rbac` | 28 PASS · 0 FAIL |
| `test:rbac` | 92 PASS · 0 FAIL |
| Browser Owner `/analytics/executivo` | PASS · 0 FAIL |

Evidência: `docs/testing/evidence/25-7-4/`
