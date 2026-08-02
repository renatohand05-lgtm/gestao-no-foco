# PHASE 29.10 — Migrations CRM e Compras

**Status:** PRONTO PARA APLICAÇÃO MANUAL  
**Data:** 2026-08-02  
**Escopo:** exclusivamente schema CRM (clientes/oportunidades) + Compras (workflow)  
**SQL remoto automático:** proibido  

---

## Causa raiz (Sprint 29.9)

| Sintoma | Classificação | Migration canônica |
|---------|---------------|--------------------|
| Create cliente/lead → “coluna ausente” / schema cache | **Migration nunca aplicada** (ou parcial) no ambiente | `20260812_crm_enterprise_fase24.sql` (colunas `valor_estimado`, `probabilidade`, `empresa_id`, …) + base `20260726` + campos 28.1 `20260802` |
| UI Compras “Schema pendente” | **Migration nunca aplicada** | `20260813_supply_chain_enterprise_fase25.sql` (`compras_pedidos`) |

Não é: rename de tabela, código desatualizado, type inventado, nem feature flag.  
`types/database.ts` e o código (`buildClientePayload`, `probePurchaseSchema`) já esperam o schema canônico.

Payload de create (`lib/clientes/mappers.ts`) envia, entre outros: `valor_estimado`, `probabilidade`, `data_prevista_fechamento`, `motivo_perda`, `empresa_id`, `filial_id`, `estagio_funil` — colunas introduzidas principalmente por **20260812** / **20260726**.

---

## Ordem manual exata de aplicação

Aplicar **no SQL Editor do Supabase** (ou pipeline controlado), nesta ordem:

| # | Arquivo | Obrigatório? | Notas |
|---|---------|--------------|-------|
| 1 | `supabase/migrations/20260726_crm_enterprise.sql` | SIM se CRM base ausente | `estagio_funil`, `consultor_id`, timeline/tarefas |
| 2 | `supabase/migrations/20260812_crm_enterprise_fase24.sql` | **SIM (CRM create)** | `valor_estimado` e demais colunas do funil + `crm_oportunidades` |
| 3 | `supabase/migrations/20260802_phase28_crm_rbac_fields.sql` | SIM (campos 28.1 + self-heal) | Idempotente; seguro após/antes de 60812 graças ao self-heal |
| 4 | `supabase/migrations/20260813_supply_chain_enterprise_fase25.sql` | **SIM (Compras)** | `compras_pedidos`, depósitos, cotações, recebimentos, RLS |
| 5 | `supabase/migrations/20260814_phase29_10_crm_compras_ensure.sql` | **Recomendado** | Ensure idempotente do mínimo crítico; seguro reexecutar |

### Pode executar do início?
**SIM** — todos os arquivos usam `IF NOT EXISTS` / checagens `to_regclass` / `information_schema` / `pg_constraint` / `pg_policies` (ensure 29.10 e 28.6.1; canônicas já idempotentes na maior parte).

### Precisa executar em blocos?
**Preferível em blocos** na ordem acima (1 arquivo por execução), recarregando o schema cache do PostgREST entre CRM e Compras se o create ainda falhar após o passo 2/5.

### Após aplicar
1. No Supabase: **Settings → API → Reload schema** (ou `NOTIFY pgrst, 'reload schema'`).  
2. Revalidar create de cliente e `/compras/pedidos` (ready=true).  
3. **Regenerate types:** opcional — `types/database.ts` já contém as colunas/tabelas; regenerar só se o projeto exigir sync formal.

---

## Riscos

| Risco | Nível | Mitigação |
|-------|-------|-----------|
| Lock em `ALTER TABLE clientes` | Baixo–médio | Janela curta; preferir horário de baixo tráfego |
| Dados existentes | Baixo | Só ADD COLUMN / CREATE IF NOT EXISTS; sem DROP |
| Constraint check em status/probabilidade | Baixo | Ensure captura exception e faz NOTICE |
| Backup | **Exigido** | Snapshot/backup antes do SQL Editor |
| Duplicar policies | Mitigado | `pg_policies` / `drop policy if exists` nas canônicas |

---

## Verificação SQL (manual, pós-aplicação)

```sql
-- CRM
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'clientes'
  and column_name in (
    'estagio_funil','valor_estimado','probabilidade','motivo_perda',
    'empresa_id','filial_id','consentimento_contato','proxima_acao'
  )
order by 1;

select to_regclass('public.crm_oportunidades');

-- Compras
select to_regclass('public.compras_pedidos');
select to_regclass('public.compras_pedido_itens');
select to_regclass('public.estoque_depositos');
```

---

## Sprint 29.10.1 (pós-aplicação)

Erro observado ao reaplicar/completar `20260812`:  
`ERROR 42703: column "ativo" does not exist` no índice  
`idx_cliente_contatos_one_principal` (`principal = true and ativo = true`).

**Correção no repositório (não executar automaticamente):**
1. `20260812_crm_enterprise_fase24.sql` — índice principal agora defensivo (`ADD COLUMN IF NOT EXISTS ativo` + `information_schema`).
2. Nova migration corretiva idempotente:  
   `20260818_phase29_10_1_fix_cliente_contatos_ativo.sql`  
   (aplicar **somente** se a coluna/índice ainda estiverem ausentes após a falha parcial).

Ver `docs/testing/evidence/29-10-1/REPORT.md`.
