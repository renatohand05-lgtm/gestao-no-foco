# Sprint 34.3 — P1 mutation RBAC + tax guards + storage CRM

**Data:** 2026-08-14
**Branch:** `main`
**Tipo:** HARDENING P1 — sem billing / Asaas / Vercel / mobile / recover / convite
**34.2:** HOMOLOGADA (sem regressão)
**Migration production:** **NÃO EXECUTADA** (manual Renato)

## Status

**SPRINT 34.3: GO** (código + testes; storage RLS aguarda apply manual)

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
| financeiro | deletes | SAFE (já `requireFinanceiroAction`) | SAFE |
| agenda | delete | SAFE (`requireAgendaPerm`) | SAFE |
| equipe | mutações | SAFE (`assertEquipeAdmin`) | SAFE |
| tax/* | actions com `tenantId` | MISSING_TENANT (+ userId client) | SAFE (`requireActiveTenantIdMutation` + sessão) |

## Correções

### Helper
- `lib/rbac/mutation-auth.ts` — `requireTenantMutationPermission` / `requireActiveTenantIdMutation`
- Fail-closed: auth + membership ativa (34.2) + permission do catálogo

### Storage CRM
- Migration: `supabase/migrations/20260826_phase34_3_p1_auth_storage_hardening.sql`
- Policies SELECT/INSERT/UPDATE/DELETE em `storage.objects` para bucket `cliente-documentos`
- Path inalterado: `{tenant_id}/clientes/...`
- App: valida `storage_path` prefix do tenant antes de signed URL
- Bucket permanece **private**

### Tax
- Toda action com `tenantId` valida membership ativa + permission
- `userId` do cliente **ignorado**; usa sessão
- `getTaxExecutiveBundleAction` exige slug + match de id

## Testes

| Gate | Resultado |
|---|---|
| `test:phase34-3-p1-mutation-auth` | 9 PASS |
| `test:phase34-2-p0-tenant-rls` | 12 PASS |
| `test:rbac` | 92 PASS |
| lint | PASS (0 errors, 30 warnings) |
| typecheck | PASS |
| build | PASS |

## Billing

**FROZEN SAFE** — nenhuma env alterada; 33.11 não iniciada.

## P1 fechados nesta sprint

1. Member delete clientes/vendas (e padrão em produtos/estoque/CRM docs/fornecedor)
2. RBAC de mutação via helper + catálogo existente
3. Tax actions sem requireTenant / userId trust
4. Storage CRM policies + path check

## P1 restantes (34.4+)

1. Recuperar senha web
2. Convite e-mail (`emailSent: false`)
3. ASAAS_PRODUCTION_API_KEY_BLOCKER (externo)

## P0 abertos

0

## Ação Renato

Aplicar `20260826_phase34_3_p1_auth_storage_hardening.sql` no SQL Editor (após review). Não iniciar 34.4 até homologar storage + smoke deletes member.
