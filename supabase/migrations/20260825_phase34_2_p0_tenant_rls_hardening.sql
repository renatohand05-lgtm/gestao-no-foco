-- Sprint 34.2 — P0 isolamento / RLS / revogação
-- NÃO edita migrations históricas.
-- NÃO executar em production automaticamente — Renato aplica no SQL Editor após revisão.
--
-- P0-1: fecha INSERT permissivo em tenant_members; criação legítima via RPC DEFINER.
-- P0-2: SELECT de membership própria exige active (cascata RLS em EXISTS de outras tabelas).
-- P0-3: Enterprise RBAC — member lê; só owner/admin ativo escreve.
--
-- Idempotente. Sem DELETE de dados. Sem perda de memberships legítimas.

-- ============================================================
-- 0) Helpers
-- ============================================================

create or replace function public.is_active_tenant_member(p_tenant_id uuid)
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
      and (tm.status is null or tm.status = 'active')
      and tm.deactivated_at is null
  );
$$;

comment on function public.is_active_tenant_member(uuid) is
  'Sprint 34.2 — true se auth.uid() é membro ativo do tenant. SECURITY DEFINER evita recursão RLS.';

grant execute on function public.is_active_tenant_member(uuid) to authenticated;

-- Reafirma is_tenant_admin (já filtra active desde 30.2)
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
      and tm.deactivated_at is null
  );
$$;

-- ============================================================
-- 1) P0-1 — RPC criação legítima de empresa + owner
-- ============================================================

create or replace function public.create_tenant_with_owner(
  p_name text,
  p_slug text,
  p_segment text default null
)
returns table (out_tenant_id uuid, out_slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tenant_id uuid;
  v_slug text;
  v_name text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  v_name := trim(coalesce(p_name, ''));
  v_slug := lower(trim(coalesce(p_slug, '')));

  if v_name = '' or char_length(v_name) > 200 then
    raise exception 'invalid_tenant_name' using errcode = '22023';
  end if;

  if v_slug = '' or char_length(v_slug) > 80 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid_tenant_slug' using errcode = '22023';
  end if;

  insert into public.tenants (name, slug, segment)
  values (v_name, v_slug, nullif(trim(coalesce(p_segment, '')), ''))
  returning id into v_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, role, status)
  values (v_tenant_id, v_uid, 'owner', 'active');

  out_tenant_id := v_tenant_id;
  out_slug := v_slug;
  return next;
end;
$$;

comment on function public.create_tenant_with_owner(text, text, text) is
  'Sprint 34.2 — cria tenant + membership owner ativa para auth.uid(). Único caminho de self-join legítimo.';

revoke all on function public.create_tenant_with_owner(text, text, text) from public;
grant execute on function public.create_tenant_with_owner(text, text, text) to authenticated;

-- ============================================================
-- 2) P0-1 + P0-2 — policies tenant_members
-- ============================================================

drop policy if exists "Usuário pode se vincular como owner ao criar empresa" on public.tenant_members;
drop policy if exists "Usuários veem seus vínculos" on public.tenant_members;
drop policy if exists "tenant_members_select_self_or_admin" on public.tenant_members;
drop policy if exists "tenant_members_select_self_active_or_admin" on public.tenant_members;
drop policy if exists "Admins inserem tenant_members" on public.tenant_members;
drop policy if exists "Admins atualizam tenant_members" on public.tenant_members;
drop policy if exists "Admins excluem tenant_members" on public.tenant_members;

-- SELECT: própria membership ATIVA, ou admin ativo do tenant (vê peers, incl. inactive)
create policy "tenant_members_select_self_active_or_admin"
  on public.tenant_members for select
  using (
    (
      user_id = auth.uid()
      and (status is null or status = 'active')
      and deactivated_at is null
    )
    or public.is_tenant_admin(tenant_id)
  );

-- INSERT direto: somente admin ativo (convites sem service role). Self-join arbitrário BLOQUEADO.
-- Criação de owner inicial: RPC create_tenant_with_owner (DEFINER).
create policy "Admins inserem tenant_members"
  on public.tenant_members for insert
  with check (public.is_tenant_admin(tenant_id));

create policy "Admins atualizam tenant_members"
  on public.tenant_members for update
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

create policy "Admins excluem tenant_members"
  on public.tenant_members for delete
  using (public.is_tenant_admin(tenant_id));

comment on table public.tenant_members is
  'Sprint 34.2 — SELECT: self active ou is_tenant_admin. INSERT/UPDATE/DELETE: admin. Owner inicial via create_tenant_with_owner().';

-- ============================================================
-- 3) P0-3 — Enterprise RBAC: member lê; admin escreve
-- ============================================================

-- tenant_roles
drop policy if exists "Membros gerenciam tenant_roles" on public.tenant_roles;
drop policy if exists "Membros leem tenant_roles" on public.tenant_roles;
drop policy if exists "Admins gerenciam tenant_roles" on public.tenant_roles;

create policy "Membros leem tenant_roles"
  on public.tenant_roles for select
  using (public.is_active_tenant_member(tenant_id));

create policy "Admins gerenciam tenant_roles"
  on public.tenant_roles for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- tenant_rbac_role_permissions
drop policy if exists "Membros gerenciam tenant_rbac_role_permissions" on public.tenant_rbac_role_permissions;
drop policy if exists "Membros leem tenant_rbac_role_permissions" on public.tenant_rbac_role_permissions;
drop policy if exists "Admins gerenciam tenant_rbac_role_permissions" on public.tenant_rbac_role_permissions;

create policy "Membros leem tenant_rbac_role_permissions"
  on public.tenant_rbac_role_permissions for select
  using (public.is_active_tenant_member(tenant_id));

create policy "Admins gerenciam tenant_rbac_role_permissions"
  on public.tenant_rbac_role_permissions for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- tenant_user_roles
drop policy if exists "Membros gerenciam tenant_user_roles" on public.tenant_user_roles;
drop policy if exists "Membros leem tenant_user_roles" on public.tenant_user_roles;
drop policy if exists "Admins gerenciam tenant_user_roles" on public.tenant_user_roles;

create policy "Membros leem tenant_user_roles"
  on public.tenant_user_roles for select
  using (public.is_active_tenant_member(tenant_id));

create policy "Admins gerenciam tenant_user_roles"
  on public.tenant_user_roles for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- tenant_user_permission_overrides
drop policy if exists "Membros gerenciam tenant_user_permission_overrides" on public.tenant_user_permission_overrides;
drop policy if exists "Membros leem tenant_user_permission_overrides" on public.tenant_user_permission_overrides;
drop policy if exists "Admins gerenciam tenant_user_permission_overrides" on public.tenant_user_permission_overrides;

create policy "Membros leem tenant_user_permission_overrides"
  on public.tenant_user_permission_overrides for select
  using (public.is_active_tenant_member(tenant_id));

create policy "Admins gerenciam tenant_user_permission_overrides"
  on public.tenant_user_permission_overrides for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- ============================================================
-- 4) Diagnóstico (somente SELECT — não altera dados)
-- ============================================================
-- Ver docs/testing/evidence/34-2/DIAGNOSTIC_QUERIES.sql
