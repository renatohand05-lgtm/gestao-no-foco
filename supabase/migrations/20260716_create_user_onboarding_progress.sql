-- Migration: progresso de onboarding por usuário × tenant (Sprint 13.12)
-- Execute manualmente no Supabase SQL Editor
-- NÃO executar automaticamente em produção sem revisão

create table if not exists public.user_onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  current_step text not null default 'welcome',
  skipped_steps text[] not null default '{}',
  preferred_preset_key text,
  tour_dismissed_at timestamptz,
  checklist_dismissed_at timestamptz,
  completed_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint user_onboarding_progress_version_positive check (version >= 1)
);

create unique index if not exists user_onboarding_progress_one_per_user_tenant
  on public.user_onboarding_progress (tenant_id, user_id)
  where deleted_at is null;

create index if not exists idx_user_onboarding_progress_tenant_user
  on public.user_onboarding_progress (tenant_id, user_id)
  where deleted_at is null;

create or replace function public.set_user_onboarding_progress_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_onboarding_progress_updated_at
  on public.user_onboarding_progress;
create trigger trg_user_onboarding_progress_updated_at
  before update on public.user_onboarding_progress
  for each row execute function public.set_user_onboarding_progress_updated_at();

alter table public.user_onboarding_progress enable row level security;

drop policy if exists "Usuários leem próprio onboarding do tenant"
  on public.user_onboarding_progress;
create policy "Usuários leem próprio onboarding do tenant"
  on public.user_onboarding_progress for select
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = user_onboarding_progress.tenant_id
        and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Usuários criam próprio onboarding do tenant"
  on public.user_onboarding_progress;
create policy "Usuários criam próprio onboarding do tenant"
  on public.user_onboarding_progress for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = user_onboarding_progress.tenant_id
        and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Usuários atualizam próprio onboarding do tenant"
  on public.user_onboarding_progress;
create policy "Usuários atualizam próprio onboarding do tenant"
  on public.user_onboarding_progress for update
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = user_onboarding_progress.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
  );
