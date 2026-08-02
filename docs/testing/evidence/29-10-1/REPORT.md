# Relatório Sprint 29.10.1 — Homologação pós-migration CRM e Compras

**Data:** 2026-08-02  
**SQL remoto:** não executado nesta sprint  
**Commit / push / deploy / tag:** não executados  

## Classificação

**APROVADO EM RUNTIME PÓS-MIGRATION**

| Decisão | Valor |
|---------|--------|
| 1. CRM homologado | **SIM** |
| 2. Compras homologadas | **SIM** |
| 3. Commit corretivo necessário | **SIM** (artefatos locais; não commitado) |
| 4. Pronto para push | **SIM** (após commit local autorizado) |
| 5. Pronto para deploy | **SIM** (após aplicar corretiva `20260818` se índice/ativo ainda ausentes + reload schema) |
| 6. Pronto para tag | **NÃO** (aguardar commit + aceite formal) |

---

## Erro 42703 — arquivo, tabela, causa

| Campo | Valor |
|-------|--------|
| **Arquivo** | `supabase/migrations/20260812_crm_enterprise_fase24.sql` |
| **Tabela** | `public.cliente_contatos` |
| **Trecho** | `create unique index … idx_cliente_contatos_one_principal … where deleted_at is null and principal = true and ativo = true` |
| **Erro** | `ERROR 42703: column "ativo" does not exist` |

### Causa raiz
`CREATE TABLE IF NOT EXISTS public.cliente_contatos` **foi pulado** porque a tabela já existia **sem** a coluna canônica `ativo`. O índice seguinte referenciava `ativo` e falhou.

A coluna `ativo` **é canônica** (definição do CREATE TABLE em 60812, `types/database.ts`, `lib/crm/enterprise/contato-service.ts`) — não foi inventada só para legado.

---

## Correção no repositório

1. **`20260812_crm_enterprise_fase24.sql`** (não destrutivo): índice principal agora defensivo — `ADD COLUMN IF NOT EXISTS ativo` + checagem `information_schema` antes do `CREATE UNIQUE INDEX`.
2. **Nova migration corretiva (não executada automaticamente):**  
   `supabase/migrations/20260818_phase29_10_1_fix_cliente_contatos_ativo.sql`  
   - ADD COLUMN IF NOT EXISTS `ativo`  
   - DROP INDEX IF EXISTS + recria índice unique  
   - Idempotente  

**Aplicar manualmente** apenas se, após a falha parcial, a coluna/índice ainda estiverem ausentes.

---

## Achado adicional em runtime (Compras)

Homologação inicial mostrou **“Schema pendente” + “Sem permissão (compras.visualizar \| estoque.visualizar)”** para Owner.

Causa: `resolveSupplyAuth` lia só snapshot `tenant_user_roles` **sem** bridge `tenant_members.role` (owner→proprietario), ao contrário do CRM. Em falha de auth, `ready` ficava `false` → **falso positivo de schema**.

Correções de produto (baixa risco, evidência comprovada):
- `lib/supply/rbac-compat.ts` + uso em `supply-enterprise-actions.ts`
- UI pedidos/inventário/almoxarifado: “Schema pendente” só quando `ready === false` (não em erro de permissão)

---

## Runtime browser (`teste-renato-01`)

| Rota | Resultado |
|------|-----------|
| CRM hub / leads / oportunidades / pipeline / follow-ups | PASS |
| Clientes / Kanban / novo | PASS |
| Compras hub / pedidos / cotações | PASS (sem Schema pendente) |
| Estoque | PASS |
| HTTP 500 | 0 |
| Console bloqueante | 0 |
| UUID visível | 0 |

**Browser 29.10.1: 17 PASS · 0 FAIL**

---

## Testes automatizados

| Suite | Resultado |
|-------|-----------|
| lint | 0 erros |
| build | EXIT 0 |
| test:phase29 | 206 PASS / 0 FAIL |
| test:release-candidate | 64 PASS / 0 FAIL |
| test:crm-core | 47 PASS / 0 FAIL |
| test:supply-core | 39 PASS / 0 FAIL |
| test:inventory-core | 15 PASS / 0 FAIL |
| test:finance-core | 53 PASS / 0 FAIL |
| test:phase29-crm-schema | 32 PASS / 0 FAIL |
| test:phase29-purchases-schema | 29 PASS / 0 FAIL |
| test:phase29-migrations-contract | 24 PASS / 0 FAIL |
| test:homolog-29-10-1 | 17 PASS / 0 FAIL |

**FAIL:** 0  

---

## Pendências

### Bloqueantes para tag
- Commit local dos artefatos 29.10 / 29.10.1  
- Aplicar `20260818_…` no Supabase **somente se** `cliente_contatos.ativo` / índice ainda faltarem  

### Não bloqueantes
- Regenerar types (já cobrem `ativo`)  
- Popular `tenant_rbac_role_permissions` no DB (bridge membership cobre Owner/Admin)  

---

## Necessidade de nova migration

**SIM** — `20260818_phase29_10_1_fix_cliente_contatos_ativo.sql` (criada; **não** executada pelo agente).
