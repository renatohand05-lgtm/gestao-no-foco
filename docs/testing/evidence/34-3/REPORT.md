# Sprint 34.3 — P1 mutation RBAC + tax guards + storage CRM

**Data fechamento:** 2026-08-14
**Branch:** `main`
**Tipo:** HARDENING P1 — sem billing / Asaas / Vercel / mobile / recover / convite
**34.2:** HOMOLOGADA (sem regressão)
**34.4:** não iniciada

## Status final

**SPRINT 34.3: HOMOLOGADA — GO**

| Critério | Status |
|---|---|
| CORE DELETE AUTH | **PASS** |
| CLIENTES DELETE | **PASS** |
| VENDAS DELETE | **PASS** |
| OUTROS DELETES CORE | **PASS** |
| MUTATION RBAC | **PASS** |
| TENANT GUARDS | **PASS** |
| TRIBUTÁRIO | **PASS** |
| STORAGE CRM | **PASS** |
| STORAGE RLS | **PASS** |
| SERVICE ROLE | **PASS** |
| CROSS-TENANT | **PASS** |
| INACTIVE MEMBER | **PASS** |
| P0 REGRESSION | **PASS** |
| RBAC | **PASS** |
| RLS | **PASS** |
| Billing | **FROZEN SAFE** |

**HOMOLOGADA PRODUCTION:** **SIM**

## Homologação production (evidência Renato)

| Item | Resultado | Nota |
|---|---|---|
| Migration `20260826_phase34_3_p1_auth_storage_hardening.sql` | **APLICADA** | Manual no Supabase Production |
| POST_MIGRATION_SMOKE | **PASS** | Estrutural |
| STORAGE-1 Policies CRM | **PASS** | 4 policies `crm_docs_*` |
| STORAGE-2 Bucket privado | **PASS** | `public = false` |
| STORAGE-3 Limite 10 MB | **PASS** | `10485760` bytes |
| STORAGE-4 Bucket existe | **PASS** | `cliente-documentos` |
| STORAGE RLS | **PASS** | |

## Inventário (resumo)

| Módulo | Mutação | Antes | Depois |
|---|---|---|---|
| clientes | `deleteClienteAction` | MISSING_PERMISSION | SAFE (`clientes.excluir`) |
| vendas | `deleteVendaAction` | MISSING_PERMISSION | SAFE (`vendas.excluir`) |
| vendas | `cancelarVendaAction` | MISSING_PERMISSION | SAFE (`vendas.cancelar`) |
| produtos | `deleteProdutoAction` | MISSING_PERMISSION | SAFE (`produtos.excluir`) |
| estoque | `deleteMovimentacaoAction` | MISSING_PERMISSION | SAFE (`estoque.excluir`) |
| CRM docs | upload/delete/signedUrl | MISSING_PERMISSION | SAFE (editar/excluir/visualizar) |
| fornecedores | `deleteFornecedorAction` | MISSING_PERMISSION | SAFE (`compras.excluir`) |
| financeiro | deletes | SAFE | SAFE |
| agenda | delete | SAFE | SAFE |
| equipe | mutações | SAFE | SAFE |
| tax/* | actions com `tenantId` | MISSING_TENANT | SAFE |

## Gates (fechamento homologação)

| Gate | Resultado |
|---|---|
| `test:phase34-3-p1-mutation-auth` | 9 PASS |
| `test:phase34-2-p0-tenant-rls` | 12 PASS |
| `test:rbac` | 92 PASS |
| lint | PASS (0 errors, 30 warnings) |
| typecheck | PASS |
| build | PASS |
| `git diff --check` | PASS |

## Billing

**FROZEN SAFE** — nenhuma env alterada; 33.11 não iniciada.

## P1 fechados

1. Member delete clientes/vendas (+ produtos/estoque/CRM docs/fornecedor)
2. Mutation RBAC via helper + catálogo
3. Tax tenant guards + userId da sessão
4. Storage CRM policies + bucket private

## P1 restantes (34.4+)

1. Recuperar senha web
2. Convite e-mail (`emailSent: false`)
3. `ASAAS_PRODUCTION_API_KEY_BLOCKER` (externo)

## P0 abertos

0

## Próxima sprint

**34.4** — recuperação de senha + convite/e-mail.

Não iniciada automaticamente — liberada após este fechamento.
