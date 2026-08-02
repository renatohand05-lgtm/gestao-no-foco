# PHASE 30.2 — Migration Equipe / Team RBAC

**Status:** PRONTO PARA APLICAÇÃO MANUAL (não aplicada nesta sessão)
**Arquivo:** `supabase/migrations/20260820_phase30_2_team_rbac.sql`
**Escopo:** exclusivamente módulo Equipe (membros, equipes, cargos, convites) — não toca DRE/financeiro/fiscal
**SQL remoto automático:** proibido nesta sessão — aplicar manualmente no SQL Editor do Supabase

---

## 1. O que a migration faz

Um único arquivo, 8 blocos sequenciais, todos idempotentes:

| # | Bloco | Objetos | Reaplicável? |
| --- | --- | --- | --- |
| 1 | Extensão de `tenant_members` | `ADD COLUMN IF NOT EXISTS` para `status`, `updated_at`, `deactivated_at`, `team_id`, `job_title_id`, `notes` + constraint `tenant_members_status_check` + índices | Sim |
| 2 | `tenant_teams` | `CREATE TABLE IF NOT EXISTS` + constraint de status + índices + FK `tenant_members.team_id → tenant_teams.id` | Sim |
| 3 | `tenant_team_members` | `CREATE TABLE IF NOT EXISTS` (histórico N:N usuário↔equipe) + índices | Sim |
| 4 | `tenant_job_titles` | `CREATE TABLE IF NOT EXISTS` + constraints (status, papel sugerido) + índices + FK `tenant_members.job_title_id → tenant_job_titles.id` | Sim |
| 5 | `tenant_invitations` | `CREATE TABLE IF NOT EXISTS` (token_hash único, nunca token em claro) + constraints (role, status) + índices + unique parcial `(tenant_id, lower(email)) WHERE status = 'pending'` | Sim |
| 6 | Funções SECURITY DEFINER | `is_tenant_admin(uuid)`, `list_tenant_member_rows(uuid)` — `create or replace function` | Sim |
| 7 | RLS novas tabelas | `ENABLE ROW LEVEL SECURITY` + policies (membros leem teams/job_titles; owner/admin administram tudo; convites só admin) via `drop policy if exists` + `create policy` | Sim |
| 8 | RLS `tenant_members` (SELECT) | Remove nomes de policy legados plausíveis e recria `tenant_members_select_self_or_admin` (própria linha OU `is_tenant_admin`) | Sim |

Nenhum `DROP TABLE`, `DROP COLUMN` ou `TRUNCATE`. Todas as alterações são aditivas.

## 2. Ordem de aplicação

Arquivo único — não há dependência de outras migrations além da base já existente (`tenants`, `tenant_members`, `profiles`). Pode ser executado do início ao fim em uma única transação no SQL Editor.

**Pré-requisito:** as tabelas `public.tenants`, `public.tenant_members` e `public.profiles` já devem existir (fazem parte do schema base do projeto, anteriores a esta sprint).

## 3. Pode executar do início? Precisa executar em blocos?

**SIM, pode executar o arquivo completo de uma vez** — todo bloco usa `IF NOT EXISTS` / `CREATE OR REPLACE FUNCTION` / `DROP POLICY IF EXISTS`. Se preferir cautela, pode colar por blocos (1 a 8) na ordem do arquivo; a ordem é significativa apenas entre os blocos 1→2→4 (FKs de `tenant_members` para `tenant_teams`/`tenant_job_titles` exigem que essas tabelas já existam — o arquivo já respeita essa ordem).

## 4. Riscos

| Risco | Nível | Mitigação |
| --- | --- | --- |
| Lock em `ALTER TABLE tenant_members` (6 `ADD COLUMN` + 1 `ADD CONSTRAINT`) | Baixo | Todas as colunas são `DEFAULT`/nullable; sem rewrite de tabela em Postgres moderno para `ADD COLUMN ... DEFAULT` de tipos simples |
| Substituição de policy de SELECT em `tenant_members` (bloco 8) | Médio | O bloco tenta remover nomes de policies legadas *plausíveis* (`Users can view own membership`, `tenant_members_select_self`, etc.) antes de criar a nova. Se o ambiente tiver uma policy com nome diferente do previsto, ela **permanecerá ativa em paralelo** — como policies do mesmo comando (`SELECT`) se combinam por `OR`, isso é seguro (não perde acesso), mas pode deixar uma policy órfã. **Ação recomendada pós-aplicação:** rodar a query da seção 6 para listar policies de `tenant_members` e remover manualmente qualquer duplicata com nome diferente do esperado. |
| `is_tenant_admin` / `list_tenant_member_rows` SECURITY DEFINER | Médio | Funções `stable`, `search_path` fixado em `public`, sem `SELECT *` livre — apenas leem `tenant_members` filtrando por `tenant_id` e `auth.uid()`. Revisar `GRANT EXECUTE` (concedido apenas a `authenticated`, não a `anon`) |
| Dados existentes em `tenant_members` | Nenhum | Apenas `ADD COLUMN` com `DEFAULT 'active'` — nenhuma linha existente é alterada além de ganhar o valor default |
| Índice único parcial `idx_tenant_teams_tenant_name` / `idx_tenant_job_titles_tenant_name` | Baixo | `WHERE status <> 'archived'/'inactive'` — só falha na criação se já houver nomes duplicados ativos, o que não pode ocorrer em tabela nova/vazia |
| Backup | **Exigido** | Snapshot/backup do Supabase antes de rodar no SQL Editor, como em toda migration deste projeto |

## 5. Após aplicar

1. No Supabase: **Settings → API → Reload schema** (ou `NOTIFY pgrst, 'reload schema'`) para o PostgREST reconhecer as tabelas/colunas novas.
2. Recarregar `app/(app)/[tenant]/configuracoes/equipe` — o `SchemaPendingBanner` deve desaparecer (todas as flags de `probeEquipeSchema` ficam `true`).
3. Validar manualmente: criar uma equipe, um cargo, um convite; trocar o papel de um membro (não-owner); confirmar que o guard de "último proprietário" bloqueia inativar o único owner.
4. **Regenerar `types/database.ts`:** opcional — os tipos das 4 tabelas novas e das colunas novas de `tenant_members` já foram adicionados manualmente neste PR e refletem o schema da migration. Regenerar (`supabase gen types typescript`) apenas se o projeto exigir sincronização formal com o schema remoto real após a aplicação.

## 6. Verificação SQL (manual, pós-aplicação)

```sql
-- Tabelas novas
select to_regclass('public.tenant_teams');
select to_regclass('public.tenant_team_members');
select to_regclass('public.tenant_job_titles');
select to_regclass('public.tenant_invitations');

-- Colunas novas em tenant_members
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'tenant_members'
  and column_name in ('status', 'updated_at', 'deactivated_at', 'team_id', 'job_title_id', 'notes')
order by 1;

-- Funções
select proname from pg_proc where proname in ('is_tenant_admin', 'list_tenant_member_rows');

-- Policies de tenant_members (checar duplicatas de policy legada — ver risco na seção 4)
select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'tenant_members';
```

## 7. Rollback

Não há script de rollback automático (nenhuma migration deste projeto possui downgrade automatizado). Como o arquivo é 100% aditivo:

- Reverter é opcional e manual: `DROP TABLE` das 4 tabelas novas (nessa ordem: `tenant_invitations`, `tenant_job_titles`, `tenant_team_members`, `tenant_teams` — para respeitar FKs), `ALTER TABLE tenant_members DROP COLUMN` das 6 colunas novas, e recriar a policy de SELECT anterior de `tenant_members` (backup do texto da policy antes de aplicar, se for necessário reverter).
- Como nada é destrutivo na aplicação, o cenário mais provável de "rollback" é simplesmente parar de usar a página `/configuracoes/equipe` — o restante do produto (Financeiro, CRM, etc.) não depende dessas tabelas.

## 8. Fora de escopo desta migration

- Filiais/multi-branch (não existe no schema atual — ver `PHASE_30_2_TEAM_RBAC.md` seção 4).
- Tabela de sessões/presença em tempo real.
- Envio real de e-mail de convite (SMTP/Resend) — a migration só persiste `token_hash`; o envio é responsabilidade de uma integração futura.
