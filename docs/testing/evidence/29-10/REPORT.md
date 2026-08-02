# Relatório Sprint 29.10 — Migrations CRM e Compras

**Data:** 2026-08-02  
**Checkpoint base:** `92f1f13` (não alterado · sem amend)  
**SQL remoto:** não executado  
**Commit / push / deploy / tag:** não executados  

## Classificação

**PRONTO PARA APLICAÇÃO DAS MIGRATIONS**

| Pergunta | Resposta |
|----------|----------|
| 1. Migration CRM necessária | **SIM** |
| 2. Migration Compras necessária | **SIM** |
| 3. Pronto para aplicação manual | **SIM** |
| 4. Pronto para deploy depois da aplicação | **SIM** (após reload schema + smoke create/pedidos) |
| 5. Commit corretivo necessário | **SIM** (artefatos locais prontos; commit sob demanda humana) |

---

## Schema esperado (código)

### CRM — `public.clientes` (create lead)
Payload (`lib/clientes/mappers.ts` → `buildClientePayload`):  
`nome`, contato/endereço, `classificacao`, `score`, `consultor_id`, `empresa_id`, `filial_id`, `valor_estimado`, `probabilidade`, `data_prevista_fechamento`, `motivo_perda`, `estagio_funil`, `ativo`, …

Types (`types/database.ts`) também documentam campos 28.1:  
`consentimento_contato`, `origem_contato_detalhe`, `prioridade_crm`, `valor_potencial`, `proxima_acao`, `data_proxima_acao`.

Oportunidades: `public.crm_oportunidades` (não existe `leads` separado; lead = cliente com `estagio_funil='lead'`).

### Compras
Probe (`probePurchaseSchema`): tabela **`public.compras_pedidos`**.  
Canônicas: `compras_pedido_itens`, `compras_cotacoes`, `compras_eventos`, `compras_cotacao_itens`, `compras_recebimentos`, `compras_recebimento_itens`, `estoque_depositos`, RLS por `tenant_members`.

---

## Schema encontrado (ambiente 29.9)

| Evidência | Interpretação |
|-----------|----------------|
| Create cliente → friendly-error “coluna ausente” / schema cache | Coluna do payload (provável `valor_estimado` / bloco Fase 24) **ausente no banco vivo** |
| Kanban `/clientes/funil` OK | `estagio_funil` e base clientes **existem** (parcial) |
| `/compras/pedidos` → “Schema pendente” + cita `20260813_...` | `compras_pedidos` **ausente** (`ready=false`) |

**Conclusão:** schema do ambiente **divergente / parcial** em relação ao código e às migrations já versionadas — não é rename nem bug de regra de negócio.

---

## Causa raiz

| Item | Classificação | Impacto | Risco | Dependências | Ordem |
|------|---------------|---------|-------|--------------|-------|
| Colunas Fase 24 em `clientes` | **Migration nunca aplicada** (ou parcial) | Bloqueia create lead/cliente | Baixo em dados (só ADD) | `clientes` base | Após `20260726` |
| Campos 28.1 | Provável não aplicada | Types/UI futura; create atual não envia todos | Baixo | `clientes` | `20260802` |
| `compras_pedidos` + cadeia | **Migration nunca aplicada** | Bloqueia workflow Compras | Baixo–médio (DDL) | `tenants`, preferencialmente `fornecedores`/`produtos` | `20260813` |
| Código / types | **Atualizados** | — | — | — | N/A |
| Feature flag | **Não** | — | — | — | N/A |

---

## Migrations

### Canônicas (não alteradas — já corretas/idempotentes)
1. `20260726_crm_enterprise.sql`  
2. `20260812_crm_enterprise_fase24.sql` — **CRM create**  
3. `20260802_phase28_crm_rbac_fields.sql`  
4. `20260813_supply_chain_enterprise_fase25.sql` — **Compras**  

### Nova (ensure)
5. `20260814_phase29_10_crm_compras_ensure.sql` — reaplicação segura do mínimo crítico; `IF NOT EXISTS` / `to_regclass` / `information_schema` / `pg_constraint` / `pg_policies`.

Documentação: `docs/architecture/PHASE_29_10_MIGRATIONS.md`

---

## Ordem de aplicação manual

1. Backup  
2. `20260726_crm_enterprise.sql` (se base CRM incompleta)  
3. `20260812_crm_enterprise_fase24.sql`  
4. `20260802_phase28_crm_rbac_fields.sql`  
5. `20260813_supply_chain_enterprise_fase25.sql`  
6. `20260814_phase29_10_crm_compras_ensure.sql`  
7. Reload schema PostgREST  
8. Smoke: criar cliente com valor estimado; abrir `/compras/pedidos`  

**Pode do início:** SIM · **Em blocos:** recomendado · **Regenerate types:** opcional (types já cobrem)

---

## Testes (0 FAIL)

| Suite | Resultado |
|-------|-----------|
| test:phase29-crm-schema | 25 PASS / 0 FAIL |
| test:phase29-purchases-schema | 29 PASS / 0 FAIL |
| test:phase29-migrations-contract | 22 PASS / 0 FAIL |
| test:phase29-tenant-isolation | 9 PASS / 0 FAIL |
| test:phase29-rbac | 6 PASS / 0 FAIL (+ rbac suite) |
| lint | 0 erros |
| build | EXIT 0 |
| test:phase29 | 206 PASS / 0 FAIL |
| test:release-candidate | 64 PASS / 0 FAIL |
| test:crm-core | 47 PASS / 0 FAIL |
| test:supply-core | 39 PASS / 0 FAIL |
| test:inventory-core | 15 PASS / 0 FAIL |
| test:finance-core | 53 PASS / 0 FAIL |

Scripts criados:  
`phase29-crm-schema-tests.mjs`, `phase29-purchases-schema-tests.mjs`, `phase29-migrations-contract-tests.mjs`, `phase29-tenant-isolation-tests.mjs`, `phase29-rbac-tests.mjs` (+ npm scripts).

---

## Pendências

### Bloqueantes para deploy
- Aplicação manual das migrations no ambiente-alvo + reload schema  

### Não bloqueantes
- Regenerar `types/database.ts` formalmente  
- Homologação browser pós-SQL (repete smoke 29.9 create/pedidos)  
- Commit local dos artefatos 29.10 (quando autorizado)

---

## Riscos

- Lock curto em `ALTER TABLE clientes`  
- Ambiente com dados inválidos vs novos CHECKs (ensure captura exceptions)  
- Aplicar só o ensure sem 60813 completo pode deixar extensões de produtos/inventário incompletas — preferir ordem completa documentada  
