-- Migration: Sprint 30.2 — Equipe / Team RBAC
-- Aplicar manualmente no Supabase SQL Editor (padrão do projeto).
-- Idempotente · não destrutivo · não remove dados nem colunas existentes.
--
-- Escopo:
--   1) Extensão de tenant_members (status, updated_at, deactivated_at, team_id, job_title_id, notes)
--   2) tenant_teams (equipes/departamentos)
--   3) tenant_team_members (histórico de participação em equipes)
--   4) tenant_job_titles (cargos)
--   5) tenant_invitations (convites — token nunca em claro, apenas hash + prefixo)
--   6) Funções SECURITY DEFINER: is_tenant_admin / list_tenant_member_rows
--   7) RLS: membros leem teams/job_titles; owner/admin administram; convites e SELECT
--      de peers em tenant_members restritos a admin.
--
-- Reaplicável: todos os blocos usam IF NOT EXISTS / DROP POLICY IF EXISTS.

-- ============================================================
-- 1) Extensão de tenant_members
-- ============================================================

alter table public.tenant_members
  add column if not exists status text not null default 'active';

alter table public.tenant_members
  add column if not exists updated_at timestamptz not null default now();

alter table public.tenant_members
  add column if not exists deactivated_at timestamptz;

alter table public.tenant_members
  add column if not exists team_id uuid;

alter table public.tenant_members
  add column if not exists job_title_id uuid;

alter table public.tenant_members
  add column if not exists notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenant_members_status_check'
  ) then
    alter table public.tenant_members
      add constraint tenant_members_status_check check (status in ('active', 'inactive'));
  end if;
end $$;

create index if not exists idx_tenant_members_team on public.tenant_members (team_id);
create index if not exists idx_tenant_members_job_title on public.tenant_members (job_title_id);
create index if not exists idx_tenant_members_status on public.tenant_members (tenant_id, status);

comment on column public.tenant_members.status is
  'Sprint 30.2 — active|inactive. Inativar revoga acesso sem excluir o vínculo histórico.';
comment on column public.tenant_members.deactivated_at is
  'Sprint 30.2 — timestamp da última inativação (null quando ativo).';
comment on column public.tenant_members.team_id is
  'Sprint 30.2 — equipe atual do membro (tenant_teams), opcional.';
comment on column public.tenant_members.job_title_id is
  'Sprint 30.2 — cargo atual do membro (tenant_job_titles), opcional.';
comment on column public.tenant_members.notes is
  'Sprint 30.2 — observações administrativas livres sobre o membro.';

-- ============================================================
-- 2) tenant_teams
-- ============================================================

create table if not exists public.tenant_teams (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  description text,
  area text,
  status text not null default 'active',
  leader_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenant_teams_status_check'
  ) then
    alter table public.tenant_teams
      add constraint tenant_teams_status_check check (status in ('active', 'inactive', 'archived'));
  end if;
end $$;

create index if not exists idx_tenant_teams_tenant on public.tenant_teams (tenant_id);
create unique index if not exists idx_tenant_teams_tenant_name
  on public.tenant_teams (tenant_id, lower(name))
  where status <> 'archived';

comment on table public.tenant_teams is
  'Sprint 30.2 — equipes/departamentos internos do tenant. Sem relação com filiais (não suportado).';

-- FK de tenant_members.team_id agora que tenant_teams existe
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenant_members_team_id_fk'
  ) then
    alter table public.tenant_members
      add constraint tenant_members_team_id_fk
      foreign key (team_id) references public.tenant_teams (id) on delete set null;
  end if;
end $$;

-- ============================================================
-- 3) tenant_team_members
-- ============================================================

create table if not exists public.tenant_team_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  team_id uuid not null references public.tenant_teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  constraint tenant_team_members_unique unique (team_id, user_id)
);

create index if not exists idx_tenant_team_members_tenant on public.tenant_team_members (tenant_id);
create index if not exists idx_tenant_team_members_user on public.tenant_team_members (tenant_id, user_id);

comment on table public.tenant_team_members is
  'Sprint 30.2 — vínculo N:N usuário↔equipe. tenant_members.team_id guarda a equipe atual; esta tabela é o histórico/participação.';

-- ============================================================
-- 4) tenant_job_titles
-- ============================================================

create table if not exists public.tenant_job_titles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  description text,
  level integer,
  team_id uuid references public.tenant_teams (id) on delete set null,
  default_membership_role text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenant_job_titles_status_check'
  ) then
    alter table public.tenant_job_titles
      add constraint tenant_job_titles_status_check check (status in ('active', 'inactive'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'tenant_job_titles_role_check'
  ) then
    alter table public.tenant_job_titles
      add constraint tenant_job_titles_role_check
      check (default_membership_role is null or default_membership_role in ('owner', 'admin', 'manager', 'member'));
  end if;
end $$;

create index if not exists idx_tenant_job_titles_tenant on public.tenant_job_titles (tenant_id);
create unique index if not exists idx_tenant_job_titles_tenant_name
  on public.tenant_job_titles (tenant_id, lower(name))
  where status <> 'inactive';

comment on table public.tenant_job_titles is
  'Sprint 30.2 — cargos internos do tenant, com papel de membership sugerido (default_membership_role).';

-- FK de tenant_members.job_title_id agora que tenant_job_titles existe
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenant_members_job_title_id_fk'
  ) then
    alter table public.tenant_members
      add constraint tenant_members_job_title_id_fk
      foreign key (job_title_id) references public.tenant_job_titles (id) on delete set null;
  end if;
end $$;

-- ============================================================
-- 5) tenant_invitations
-- ============================================================

create table if not exists public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text not null,
  full_name text,
  membership_role text not null default 'member',
  team_id uuid references public.tenant_teams (id) on delete set null,
  job_title_id uuid references public.tenant_job_titles (id) on delete set null,
  token_hash text not null,
  token_prefix text not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  message text,
  invited_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  accepted_user_id uuid references public.profiles (id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resent_at timestamptz
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenant_invitations_role_check'
  ) then
    alter table public.tenant_invitations
      add constraint tenant_invitations_role_check
      check (membership_role in ('owner', 'admin', 'manager', 'member'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'tenant_invitations_status_check'
  ) then
    alter table public.tenant_invitations
      add constraint tenant_invitations_status_check
      check (status in ('pending', 'accepted', 'expired', 'cancelled'));
  end if;
end $$;

create unique index if not exists idx_tenant_invitations_token_hash on public.tenant_invitations (token_hash);
create index if not exists idx_tenant_invitations_tenant on public.tenant_invitations (tenant_id);
create index if not exists idx_tenant_invitations_email on public.tenant_invitations (tenant_id, lower(email));
create index if not exists idx_tenant_invitations_status on public.tenant_invitations (tenant_id, status);
-- Um único convite pendente ativo por e-mail no tenant (impede duplicata)
create unique index if not exists idx_tenant_invitations_pending_email
  on public.tenant_invitations (tenant_id, lower(email))
  where status = 'pending';

comment on table public.tenant_invitations is
  'Sprint 30.2 — convites de acesso. token_hash (sha256) único; o token em claro nunca é persistido, apenas retornado uma vez na criação.';

-- ============================================================
-- 6) Funções SECURITY DEFINER
-- ============================================================

create or replace function public.is_tenant_admin(p_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner', 'admin')
      and (tm.status is null or tm.status = 'active')
  );
$$;

comment on function public.is_tenant_admin(uuid) is
  'Sprint 30.2 — true se auth.uid() for owner/admin ativo do tenant informado. SECURITY DEFINER evita recursão de RLS em tenant_members.';

grant execute on function public.is_tenant_admin(uuid) to authenticated;

create or replace function public.list_tenant_member_rows(p_tenant_id uuid)
returns setof public.tenant_members
language sql
security definer
set search_path = public
stable
as $$
  select tm.*
  from public.tenant_members tm
  where tm.tenant_id = p_tenant_id
    and public.is_tenant_admin(p_tenant_id);
$$;

comment on function public.list_tenant_member_rows(uuid) is
  'Sprint 30.2 — lista membros do tenant para chamador admin (SECURITY DEFINER); retorna vazio se o chamador não for owner/admin ativo.';

grant execute on function public.list_tenant_member_rows(uuid) to authenticated;

-- ============================================================
-- 7) RLS — tenant_teams / tenant_team_members / tenant_job_titles / tenant_invitations
-- ============================================================

alter table public.tenant_teams enable row level security;
alter table public.tenant_team_members enable row level security;
alter table public.tenant_job_titles enable row level security;
alter table public.tenant_invitations enable row level security;

-- tenant_teams: membros leem; owner/admin administram
drop policy if exists "Membros leem tenant_teams" on public.tenant_teams;
create policy "Membros leem tenant_teams"
  on public.tenant_teams for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_teams.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Admins administram tenant_teams" on public.tenant_teams;
create policy "Admins administram tenant_teams"
  on public.tenant_teams for insert
  with check (public.is_tenant_admin(tenant_id));

drop policy if exists "Admins atualizam tenant_teams" on public.tenant_teams;
create policy "Admins atualizam tenant_teams"
  on public.tenant_teams for update
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

drop policy if exists "Admins excluem tenant_teams" on public.tenant_teams;
create policy "Admins excluem tenant_teams"
  on public.tenant_teams for delete
  using (public.is_tenant_admin(tenant_id));

-- tenant_team_members: membros leem; owner/admin administram
drop policy if exists "Membros leem tenant_team_members" on public.tenant_team_members;
create policy "Membros leem tenant_team_members"
  on public.tenant_team_members for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_team_members.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Admins administram tenant_team_members" on public.tenant_team_members;
create policy "Admins administram tenant_team_members"
  on public.tenant_team_members for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- tenant_job_titles: membros leem; owner/admin administram
drop policy if exists "Membros leem tenant_job_titles" on public.tenant_job_titles;
create policy "Membros leem tenant_job_titles"
  on public.tenant_job_titles for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_job_titles.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Admins administram tenant_job_titles" on public.tenant_job_titles;
create policy "Admins administram tenant_job_titles"
  on public.tenant_job_titles for insert
  with check (public.is_tenant_admin(tenant_id));

drop policy if exists "Admins atualizam tenant_job_titles" on public.tenant_job_titles;
create policy "Admins atualizam tenant_job_titles"
  on public.tenant_job_titles for update
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

drop policy if exists "Admins excluem tenant_job_titles" on public.tenant_job_titles;
create policy "Admins excluem tenant_job_titles"
  on public.tenant_job_titles for delete
  using (public.is_tenant_admin(tenant_id));

-- tenant_invitations: dados sensíveis (email, token_prefix) — somente owner/admin, em qualquer operação
drop policy if exists "Admins gerenciam tenant_invitations" on public.tenant_invitations;
create policy "Admins gerenciam tenant_invitations"
  on public.tenant_invitations for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- ============================================================
-- 8) Expande SELECT de tenant_members (admin vê peers; demais só a própria linha)
-- ============================================================

-- Nomes de policies legadas plausíveis — removidas se existirem (idempotente e seguro:
-- múltiplas policies permissivas do mesmo comando combinam por OR, então não há perda de acesso).
drop policy if exists "Users can view own membership" on public.tenant_members;
drop policy if exists "Usuarios veem própria membership" on public.tenant_members;
drop policy if exists "tenant_members_select_self" on public.tenant_members;
drop policy if exists "Membros leem tenant_members" on public.tenant_members;
drop policy if exists "Enable read access for own user" on public.tenant_members;
drop policy if exists "tenant_members_select_self_or_admin" on public.tenant_members;

create policy "tenant_members_select_self_or_admin"
  on public.tenant_members for select
  using (
    user_id = auth.uid()
    or public.is_tenant_admin(tenant_id)
  );

comment on table public.tenant_members is
  'Sprint 30.2 — + status/updated_at/deactivated_at/team_id/job_title_id/notes. SELECT: própria linha ou owner/admin ativo do tenant (is_tenant_admin).';
