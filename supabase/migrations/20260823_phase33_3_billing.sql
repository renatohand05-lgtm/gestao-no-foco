-- Sprint 33.3 — Billing SaaS mínimo (provider-agnostic).
-- Idempotente. Não destrói dados. Não cobra. Não escolhe provedor.
-- Aplicar MANUALMENTE no SQL Editor após snapshot (docs/billing/PILOT_BILLING_RUNBOOK.md).
-- Rollback: drop tables billing_* (não recomendado com dados piloto).

-- ── Helpers RLS ──────────────────────────────────────────────
create or replace function public.can_read_billing(p_tenant_id uuid)
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
  );
$$;

comment on function public.can_read_billing(uuid) is
  'Sprint 33.3 — membro ativo lê assinatura do próprio tenant.';

create or replace function public.can_manage_billing(p_tenant_id uuid)
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
      and tm.role = 'owner'
      and (tm.status is null or tm.status = 'active')
  );
$$;

comment on function public.can_manage_billing(uuid) is
  'Sprint 33.3 — somente OWNER gerencia assinatura do tenant (não eleva RBAC).';

grant execute on function public.can_read_billing(uuid) to authenticated;
grant execute on function public.can_manage_billing(uuid) to authenticated;
revoke all on function public.can_read_billing(uuid) from public, anon;
revoke all on function public.can_manage_billing(uuid) from public, anon;

-- ── Plans (catálogo global; não é por tenant) ────────────────
create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  amount_cents integer null check (amount_cents is null or amount_cents >= 0),
  currency text null,
  billing_interval text null
    check (billing_interval is null or billing_interval in ('month', 'year')),
  entitlements jsonb not null default '{}'::jsonb,
  is_pilot boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_plans_slug_unique unique (slug)
);

comment on table public.billing_plans is
  'Sprint 33.3 — catálogo de planos SaaS. Preço null = ainda sem definição comercial.';

create index if not exists idx_billing_plans_status
  on public.billing_plans (status);

-- ── Subscriptions (1 por tenant) ─────────────────────────────
create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  plan_id uuid not null references public.billing_plans (id),
  status text not null
    check (status in ('trial', 'active', 'past_due', 'canceled')),
  provider text not null default 'none',
  provider_customer_id text null,
  provider_subscription_id text null,
  trial_start timestamptz null,
  trial_end timestamptz null,
  current_period_start timestamptz null,
  current_period_end timestamptz null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_subscriptions_tenant_unique unique (tenant_id)
);

comment on table public.billing_subscriptions is
  'Sprint 33.3 — assinatura pertence ao TENANT (empresa), nunca ao usuário.';

create index if not exists idx_billing_subscriptions_status
  on public.billing_subscriptions (status);
create index if not exists idx_billing_subscriptions_provider
  on public.billing_subscriptions (provider);

-- ── Webhook events (idempotência) ────────────────────────────
create table if not exists public.billing_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  tenant_id uuid null references public.tenants (id) on delete set null,
  event_type text null,
  payload_summary jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint billing_provider_events_unique unique (provider, event_id)
);

comment on table public.billing_provider_events is
  'Sprint 33.3 — dedupe de webhooks (provider + event_id). Sem PAN/secrets.';

-- ── Checkout attempts (idempotência) ─────────────────────────
create table if not exists public.billing_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  idempotency_key text not null,
  plan_slug text not null,
  status text not null
    check (status in ('pending', 'provider_missing', 'ready', 'failed', 'completed')),
  provider text not null default 'none',
  result_summary jsonb not null default '{}'::jsonb,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_checkout_attempts_idem unique (tenant_id, idempotency_key)
);

comment on table public.billing_checkout_attempts is
  'Sprint 33.3 — impede checkout duplicado (double-click/retry). Frontend nunca marca paid.';

-- ── Seed plano piloto (sem preço comercial) ──────────────────
insert into public.billing_plans (
  slug, name, status, amount_cents, currency, billing_interval, entitlements, is_pilot
)
values (
  'pilot',
  'Piloto / Trial interno',
  'active',
  null,
  null,
  null,
  jsonb_build_object(
    'modules', jsonb_build_array(
      'dashboard', 'crm', 'operacao', 'estoque', 'financeiro', 'equipe', 'configuracoes'
    ),
    'note', 'Plano temporário de piloto — sem preço hardcoded'
  ),
  true
)
on conflict (slug) do update set
  name = excluded.name,
  entitlements = excluded.entitlements,
  is_pilot = true,
  updated_at = now();

-- ── RLS ──────────────────────────────────────────────────────
alter table public.billing_plans enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_provider_events enable row level security;
alter table public.billing_checkout_attempts enable row level security;

drop policy if exists billing_plans_select_auth on public.billing_plans;
create policy billing_plans_select_auth
  on public.billing_plans for select
  to authenticated
  using (status = 'active' or status = 'inactive');

-- Mutação de plans: service role only (sem policy de write para authenticated)

drop policy if exists billing_subscriptions_select_member on public.billing_subscriptions;
create policy billing_subscriptions_select_member
  on public.billing_subscriptions for select
  to authenticated
  using (public.can_read_billing(tenant_id));

drop policy if exists billing_subscriptions_insert_owner on public.billing_subscriptions;
create policy billing_subscriptions_insert_owner
  on public.billing_subscriptions for insert
  to authenticated
  with check (public.can_manage_billing(tenant_id));

drop policy if exists billing_subscriptions_update_owner on public.billing_subscriptions;
create policy billing_subscriptions_update_owner
  on public.billing_subscriptions for update
  to authenticated
  using (public.can_manage_billing(tenant_id))
  with check (public.can_manage_billing(tenant_id));

-- Sem DELETE para authenticated — cancelamento = status canceled

drop policy if exists billing_checkout_select_owner on public.billing_checkout_attempts;
create policy billing_checkout_select_owner
  on public.billing_checkout_attempts for select
  to authenticated
  using (public.can_manage_billing(tenant_id));

drop policy if exists billing_checkout_insert_owner on public.billing_checkout_attempts;
create policy billing_checkout_insert_owner
  on public.billing_checkout_attempts for insert
  to authenticated
  with check (public.can_manage_billing(tenant_id));

drop policy if exists billing_checkout_update_owner on public.billing_checkout_attempts;
create policy billing_checkout_update_owner
  on public.billing_checkout_attempts for update
  to authenticated
  using (public.can_manage_billing(tenant_id))
  with check (public.can_manage_billing(tenant_id));

-- provider_events: sem acesso authenticated (somente service role / webhook)
drop policy if exists billing_provider_events_deny_all on public.billing_provider_events;
-- RLS on + zero policies for authenticated = deny by default for anon/auth
-- service role bypasses RLS

revoke all on table public.billing_provider_events from anon, authenticated;
grant select on table public.billing_plans to authenticated;
grant select, insert, update on table public.billing_subscriptions to authenticated;
grant select, insert, update on table public.billing_checkout_attempts to authenticated;
-- service role (via supabase) tem full access por bypass RLS
