# Sprint 25.7.5 — CRM Runtime + Encerramento Sprint 25

**Classificação:** APROVADO EM RUNTIME  
**Data:** 2026-07-31

## Causa raiz exata

| Campo | Valor |
|-------|--------|
| Erro original | `Error: Sem permissão crm.visualizar.` |
| Arquivo | `lib/crm/crm-enterprise-actions.ts` |
| Linha | 50 (pré-correção) |
| Digest | `3042956953` |
| Fluxo | `/crm` → redirect `/crm/executivo` → `getExecutiveCrmDashboard` → `resolveCrmAuth` |
| Etapa | Guard RBAC server-side (snapshot Enterprise vazio/parcial) |

Owner autenticado (`tenant_members.role = owner`) **não** tinha linhas em `tenant_user_roles` / `tenant_rbac_role_permissions`. O CRM lia só o snapshot Enterprise (igual ao bug do Analytics antes do 25.7.3/4), lançava erro e o `error.tsx` do tenant mostrava “Erro na área da empresa”.

Não era schema ausente, migration faltando, hidratação ou query quebrada.

## Schema validado

- Migration `20260812_crm_enterprise_fase24.sql` cobre: `crm_pipeline_stages`, `crm_oportunidades`, `crm_stage_movements`, `cliente_contatos`
- **Migration necessária adicional: NÃO**

## Correção aplicada

1. `lib/crm/rbac-compat.ts` — bridge Owner→`proprietario` / Admin→`diretor` + fill de chaves `crm.*` / `clientes.*`
2. `lib/crm/crm-enterprise-actions.ts` + `crm-corrections-actions.ts` — usam `resolveCrmEffectivePermissions({ membershipRole: tenant.role, ... })`
3. Página executivo — UI controlada só para negação de permissão/sessão; demais erros continuam no error boundary
4. `RouteError` — digest + retry + link início + log dev com stack (sem secrets)
5. Empty state CRM com CTA “Novo cliente”

## Empty states

- Dashboard vazio: `ExecutiveEmptyState` + CTA cadastro
- Pipeline vazio: badge + “Nenhuma etapa ativa” + seed explícito
- Agenda: links para agenda/tarefas operacionais (sem inventar eventos)

## RBAC por perfil

| Perfil | CRM visualizar | Escrita |
|--------|----------------|---------|
| Owner | ALLOW | ALLOW |
| Admin | ALLOW | ALLOW (diretor) |
| Comercial | ALLOW | ALLOW |
| Financeiro | DENY | DENY |
| Operacional | ALLOW visualizar | conforme catálogo |
| Read-only | ALLOW visualizar | DENY criar/editar/configurar |

Tenant isolation preservado (compat só no membership do tenant autenticado). Sem bypass.

## Rotas validadas (browser)

| Rota | Resultado |
|------|-----------|
| `/crm` | PASS |
| `/crm/executivo` | PASS |
| `/crm/pipeline` | PASS |
| `/crm/agenda` | PASS |
| `/crm/indicadores` | PASS |

## Testes (0 FAIL)

| Suite | Resultado |
|-------|-----------|
| test:crm-runtime | 17 PASS |
| test:crm-empty-state | 9 PASS |
| test:crm-schema-contract | 12 PASS |
| test:crm-rbac-final | 22 PASS |
| test:crm-core | 47 PASS |
| test:rbac | 92 PASS |
| test:owner-rbac | 28 PASS |
| test:executive-rbac-final | 31 PASS |
| test:sidebar-navigation-keys | 31 PASS |
| test:global-css | 27 PASS |
| test:release-candidate | 64 PASS |
| lint | OK |
| build | OK |
| browser runtime | 5 PASS · 0 FAIL |

## Evidências

`docs/testing/evidence/25-7-5/`

## Limitações restantes

- Subrotas literais `crm/clientes`, `crm/oportunidades`, `crm/relacionamentos` não existem como paths próprios (clientes/oportunidades vivem em `/clientes*` e pipeline CRM).
- Homologação Comercial/read-only no browser depende de contas nesses papéis (matriz coberta por testes unitários).
- Se `20260812` ainda não estiver aplicada no projeto Supabase remoto, pipeline/oportunidades falham em query (fora do escopo deste bug de RBAC); SQL permanece para execução manual.

## Encerramento Sprint 25

CRM **APROVADO EM RUNTIME** → Sprint 25 pode ser considerada encerrada neste eixo (UI premium + RBAC executivo + CRM runtime).
