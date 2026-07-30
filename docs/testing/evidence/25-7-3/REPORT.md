# Sprint 25.7.3 — Validação RBAC Owner × Dashboard Executivo

**Classificação:** APROVADO EM RUNTIME  
**Data:** 2026-07-30  
**Tenant:** `teste-renato-01`  
**Base URL:** http://localhost:3001  

## Causa raiz

O guard do Dashboard Executivo (`resolveAnalyticsAuth` em `lib/analytics/analytics-actions.ts`) lia **somente** o snapshot Enterprise:

- `tenant_user_roles`
- `tenant_rbac_role_permissions`

Ignorava o papel legado `tenant_members.role` (`owner` / `admin`).

O catálogo canónico já concede as permissões ao papel `proprietario`, mas o Owner autenticado frequentemente **não** tinha linhas Enterprise (ou tinha snapshot parcial sem chaves `analytics.*` / `dashboard.executivo`). Resultado: permissões vazias/incompletas no frontend → bloqueio:

`Sem permissão: analytics.visualizar | analytics.executivo | dashboard.executivo`

Finance e Catalog Import já tinham bridge de compatibilidade; Analytics não.

## Árvore User → Role → Permissões

```
Usuário autenticado (session)
  ↓
tenant_members.role = owner
  ↓ (compat MEMBERSHIP_TO_ENTERPRISE_ROLES)
Enterprise role = proprietario
  ↓ (ROLE_PERMISSIONS / TENANT_ALL + expand aliases)
Permissões carregadas (entre outras):
  • analytics.visualizar
  • analytics.executivo
  • dashboard.executivo
  • analytics.* / dashboard.*
  ↓
Permissões exigidas (any-of):
  • analytics.visualizar
  • analytics.executivo
  • dashboard.executivo
  ↓
ALLOW (Owner)
```

Admin (`tenant_members.role = admin`) → `diretor` → mesmas chaves executivas do catálogo.

Member/manager **sem** snapshot Enterprise → **sem** over-grant (RBAC preservado).

## Permissões recebidas vs faltantes (antes)

| Chave | Exigida | Snapshot Enterprise (Owner típico) | Após correção |
|-------|---------|--------------------------------------|---------------|
| `analytics.visualizar` | any-of | ausente | presente (compat) |
| `analytics.executivo` | any-of | ausente | presente (compat) |
| `dashboard.executivo` | any-of | ausente | presente (compat) |

## Origem da falha

`lib/analytics/analytics-actions.ts` → `resolveAnalyticsAuth` usava `snap.permissions` sem merge com `tenant.role` / catálogo `proprietario`.

## Correção aplicada

1. Novo `lib/analytics/rbac-compat.ts` (padrão Finance / Catalog Import):
   - `owner` → `proprietario`
   - `admin` → `diretor`
   - snapshot vazio/parcial → completa chaves `analytics.*` / `dashboard.*` do catálogo
   - sem liberar member/manager sem Enterprise
2. `resolveAnalyticsAuth` passa a usar `resolveAnalyticsEffectivePermissions({ membershipRole: tenant.role, ... })`.
3. Testes: `npm run test:analytics-owner-rbac`.

**Não** removido RBAC · **não** aberto acesso a todos · **não** alteradas regras de isolamento por tenant.

## Validação

### Testes (0 FAIL)

| Suite | Resultado |
|-------|-----------|
| `test:analytics-owner-rbac` | 28 PASS · 0 FAIL |
| `test:analytics-core` | 51 PASS · 0 FAIL |
| `test:analytics-experience` | 41 PASS · 0 FAIL |
| `test:analytics-corrections` | 57 PASS · 0 FAIL |
| `test:rbac` | 92 PASS · 0 FAIL |
| `test:import-permissions` | 27 PASS · 0 FAIL |

### Navegador (Playwright)

Script: `scripts/capture-25-7-3-owner-rbac.mjs`  
Evidência: `docs/testing/evidence/25-7-3/`

| Check | Resultado |
|-------|-----------|
| dashboard | PASS — sem bloqueio |
| `/analytics` → executivo | PASS — sem “Sem permissão” |
| `/analytics/executivo` | PASS — UI **Analytics Enterprise** + KPIs; badge **Owner**; sem “Sem permissão” |

**Runtime: 3 PASS · 0 FAIL**

Evidência visual: `docs/testing/evidence/25-7-3/analytics-executivo-direct.png`
