-- Migration: Sprint 21.6 / RC3 — Enterprise RBAC persistence (tenant-scoped)
--
-- IMPORTANTE (RC3):
-- public.tenant_role_permissions JÁ EXISTE (oficina 20260728) com schema:
--   (tenant_id, role text, permission_key, allowed boolean)
-- NÃO recriar / NÃO indexar role_id nessa tabela.
--
-- Modelo Enterprise (catálogo tipado por UUID) usa tabela NOVA:
--   public.tenant_rbac_role_permissions (role_id → tenant_roles)

-- Cleanup de tentativa RC anterior (índice inválido sobre tabela legado)
drop index if exists public.idx_tenant_role_permissions_role;
-- Policy Enterprise indevida sobre a tabela legado (se RLS RC foi parcialmente aplicado)
drop policy if exists "Membros gerenciam tenant_role_permissions" on public.tenant_role_permissions;

create table if not exists public.tenant_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  role_key text not null,
  name text not null,
  description text null,
  level integer not null default 0,
  type text not null default 'custom',
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_roles_key_unique unique (tenant_id, role_key)
);

-- Grants por role_id (Enterprise) — nome distinto do legado tenant_role_permissions
create table if not exists public.tenant_rbac_role_permissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  role_id uuid not null references public.tenant_roles (id) on delete cascade,
  permission_key text not null,
  effect text not null default 'allow',
  created_at timestamptz not null default now(),
  constraint tenant_rbac_role_permissions_unique unique (tenant_id, role_id, permission_key),
  constraint tenant_rbac_role_permissions_effect_check check (effect in ('allow', 'deny'))
);

create table if not exists public.tenant_user_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.tenant_roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid null references public.profiles (id) on delete set null,
  expires_at timestamptz null,
  constraint tenant_user_roles_unique unique (tenant_id, user_id, role_id)
);

create table if not exists public.tenant_user_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  permission_key text not null,
  effect text not null,
  reason text null,
  created_by uuid null references public.profiles (id) on delete set null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint tenant_user_permission_overrides_unique unique (tenant_id, user_id, permission_key),
  constraint tenant_user_permission_overrides_effect_check check (effect in ('allow', 'deny'))
);

create index if not exists idx_tenant_roles_tenant
  on public.tenant_roles (tenant_id);
create index if not exists idx_tenant_rbac_role_permissions_role
  on public.tenant_rbac_role_permissions (tenant_id, role_id);
create index if not exists idx_tenant_user_roles_user
  on public.tenant_user_roles (tenant_id, user_id);
create index if not exists idx_tenant_user_overrides_user
  on public.tenant_user_permission_overrides (tenant_id, user_id);

comment on table public.tenant_roles is
  'Sprint 21.6 — catálogo de roles Enterprise (UUID). Independente de tenant_members.role.';
comment on table public.tenant_rbac_role_permissions is
  'Sprint 21.6 RC3 — permissões por role_id. NÃO confundir com tenant_role_permissions (legado oficina: role text + allowed).';
comment on table public.tenant_role_permissions is
  'Legado oficina — (tenant_id, role text, permission_key, allowed). Mantido intacto.';
