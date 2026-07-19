-- Migration: Dashboard layouts persistentes por usuário/tenant (Sprint 13.6)
-- Execute manualmente no Supabase SQL Editor
-- NÃO executar automaticamente em produção sem revisão

create table if not exists public.dashboard_layouts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  preset_key text,
  layout_data jsonb not null,
  density text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint dashboard_layouts_name_not_blank check (char_length(trim(name)) > 0),
  constraint dashboard_layouts_version_positive check (version >= 1),
  constraint dashboard_layouts_density_check check (
    density is null
    or density in ('executive', 'comfortable', 'compact')
  )
);

create index if not exists idx_dashboard_layouts_tenant_id
  on public.dashboard_layouts (tenant_id);

create index if not exists idx_dashboard_layouts_user_id
  on public.dashboard_layouts (user_id);

create index if not exists idx_dashboard_layouts_tenant_user
  on public.dashboard_layouts (tenant_id, user_id)
  where deleted_at is null;

create index if not exists idx_dashboard_layouts_deleted_at
  on public.dashboard_layouts (deleted_at);

create index if not exists idx_dashboard_layouts_updated_at
  on public.dashboard_layouts (tenant_id, user_id, updated_at desc)
  where deleted_at is null;

-- Um layout padrão por usuário × tenant
create unique index if not exists dashboard_layouts_one_default_per_user_tenant
  on public.dashboard_layouts (tenant_id, user_id)
  where is_default = true and deleted_at is null;

create or replace function public.set_dashboard_layouts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_dashboard_layouts_updated_at on public.dashboard_layouts;
create trigger trg_dashboard_layouts_updated_at
  before update on public.dashboard_layouts
  for each row execute function public.set_dashboard_layouts_updated_at();

alter table public.dashboard_layouts enable row level security;

-- Leitura: membro do tenant E dono do layout
drop policy if exists "Usuários leem próprios layouts do tenant"
  on public.dashboard_layouts;
create policy "Usuários leem próprios layouts do tenant"
  on public.dashboard_layouts for select
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = dashboard_layouts.tenant_id
        and tm.user_id = auth.uid()
    )
  );

-- Insert: só para si, no tenant em que é membro
drop policy if exists "Usuários criam próprios layouts"
  on public.dashboard_layouts;
create policy "Usuários criam próprios layouts"
  on public.dashboard_layouts for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = dashboard_layouts.tenant_id
        and tm.user_id = auth.uid()
    )
  );

-- Update: só próprios (inclui soft delete)
drop policy if exists "Usuários editam próprios layouts"
  on public.dashboard_layouts;
create policy "Usuários editam próprios layouts"
  on public.dashboard_layouts for update
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = dashboard_layouts.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = dashboard_layouts.tenant_id
        and tm.user_id = auth.uid()
    )
  );

-- Delete físico bloqueado via RLS (usar soft delete); sem policy DELETE

comment on table public.dashboard_layouts is
  'Layouts personalizados do Dashboard Executivo — um usuário × tenant (Sprint 13.6)';
comment on column public.dashboard_layouts.layout_data is
  'Snapshot JSON versionado (blocks, presetId, compactMode, …)';
comment on column public.dashboard_layouts.density is
  'Perfil de densidade global: executive | comfortable | compact';
comment on column public.dashboard_layouts.is_default is
  'Layout padrão carregado ao abrir o dashboard';
comment on column public.dashboard_layouts.version is
  'Controle otimista de concorrência';
