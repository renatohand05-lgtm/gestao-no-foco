# Migrations — Fase 30 (Equipe / Team RBAC)

**Documento canônico da Sprint 30.2** para a migration de Equipe.  
**Status:** PRONTO PARA APLICAÇÃO MANUAL  
**SQL remoto automático / `supabase db push` não autorizado nesta sprint.**

Arquitetura do módulo: [PHASE_30_2_TEAM_RBAC.md](./PHASE_30_2_TEAM_RBAC.md).

---

## Arquivo

| Campo | Valor |
|-------|--------|
| Arquivo | `supabase/migrations/20260820_phase30_2_team_rbac.sql` |
| Idempotente | Sim (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`, checks em `pg_constraint`) |
| Destrutivo | Não — sem `DROP TABLE` / sem remoção de colunas ou dados |
| Dependências | `public.tenants`, `public.tenant_members`, `public.profiles`, helpers RLS existentes |

Allowlist Release Candidate: entrada `20260820_phase30_2_team_rbac.sql` em `scripts/release-candidate-tests.mjs`.

---

## O que a migration faz

1. **Extende `tenant_members`**  
   `status` (`active`|`inactive`), `updated_at`, `deactivated_at`, `team_id`, `job_title_id`, `notes` + índices/checks.

2. **Cria `tenant_teams`**  
   Equipes/departamentos do tenant (`status` active/inactive/archived, `leader_user_id`).

3. **Cria `tenant_team_members`**  
   Participação N:N usuário↔equipe (histórico); `tenant_members.team_id` é a equipe atual.

4. **Cria `tenant_job_titles`**  
   Cargos com `default_membership_role` opcional.

5. **Cria `tenant_invitations`**  
   Convites com `token_hash` + `token_prefix` (token em claro nunca persistido).

6. **Funções SECURITY DEFINER**  
   - `public.is_tenant_admin(p_tenant_id uuid)`  
   - `public.list_tenant_member_rows(p_tenant_id uuid)` — listagem de peers só para admin.

7. **RLS**  
   Membros leem teams/job titles do próprio tenant; mutações e listagem ampla de membros restritas a owner/admin ativos.

---

## Ordem de aplicação manual

1. Backup / snapshot do projeto Supabase.  
2. Abrir **SQL Editor**.  
3. Colar e executar **integralmente** o conteúdo de `20260820_phase30_2_team_rbac.sql`.  
4. Recarregar schema PostgREST (**Settings → API → Reload schema** ou `NOTIFY pgrst, 'reload schema'`).  
5. Validar na UI: `/[tenant]/configuracoes/equipe` — banner “schema pendente” deve sumir quando as tabelas existirem.  
6. Types: `types/database.ts` **já** inclui as tabelas/colunas da 30.2; regenerar só se a política do projeto exigir sync formal.

Pode reaplicar com segurança (idempotente). Preferir um único bloco por execução.

---

## Verificação SQL (pós-aplicação)

```sql
-- Colunas novas em tenant_members
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'tenant_members'
  and column_name in (
    'status', 'updated_at', 'deactivated_at',
    'team_id', 'job_title_id', 'notes'
  )
order by 1;

-- Tabelas novas
select to_regclass('public.tenant_teams');
select to_regclass('public.tenant_team_members');
select to_regclass('public.tenant_job_titles');
select to_regclass('public.tenant_invitations');

-- Funções
select proname
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('is_tenant_admin', 'list_tenant_member_rows');
```

---

## Riscos

| Risco | Nível | Mitigação |
|-------|-------|-----------|
| Lock em `ALTER TABLE tenant_members` | Baixo–médio | Janela curta / baixo tráfego |
| Policies antigas de SELECT em membros | Baixo | Migration recria policies com `DROP POLICY IF EXISTS` |
| Schema cache PostgREST | Médio | Reload explícito após apply |
| Aplicar só trechos | Evitar | Executar arquivo completo |

---

## Relação com o código

| Situação | Comportamento |
|----------|----------------|
| Migration **não** aplicada | `probeEquipeSchema` → UI com `SchemaPendingBanner` (honesto) |
| Migration aplicada | Hub Equipe opera com dados reais do tenant |
| Sem provider de e-mail | Convite gera link one-time para admin copiar |

---

## Fora deste arquivo

Histórico de migrations anteriores (CRM, Compras, Import, Tax, Intelligence) permanece documentado em `PHASE_29_10_MIGRATIONS.md`, `PHASE_28_MIGRATIONS.md` e docs de sprint correspondentes. Este `MIGRATIONS.md` cobre o **fechamento da Sprint 30.2 (Equipe)**.
