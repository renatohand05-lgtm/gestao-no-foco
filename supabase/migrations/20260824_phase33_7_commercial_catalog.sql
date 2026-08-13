-- Sprint 33.7 — catálogo comercial em billing_plans (já existente).
-- Idempotente. Não destrói dados. Não cobra. Não altera plano piloto.
-- Aplicar MANUALMENTE no SQL Editor. Não executa Asaas production.

insert into public.billing_plans (
  slug, name, status, amount_cents, currency, billing_interval, entitlements, is_pilot
)
values
(
  'essential',
  'Essencial',
  'active',
  27990,
  'BRL',
  'month',
  jsonb_build_object(
    'modules', jsonb_build_array('dashboard','crm','operacao','estoque','financeiro','equipe','configuracoes'),
    'includesConsulting', false,
    'requiresSalesContact', false,
    'trialDays', 14,
    'recommended', false,
    'displayOrder', 1,
    'description', 'Essencial',
    'note', 'Entitlements CORE até decisão comercial. R$ 19,90 não é preço comercial.'
  ),
  false
),
(
  'management',
  'Gestão',
  'active',
  47990,
  'BRL',
  'month',
  jsonb_build_object(
    'modules', jsonb_build_array('dashboard','crm','operacao','estoque','financeiro','equipe','configuracoes'),
    'includesConsulting', false,
    'requiresSalesContact', false,
    'trialDays', 14,
    'recommended', true,
    'displayOrder', 2,
    'description', 'Gestão',
    'note', 'Plano recomendado na UI. Entitlements CORE até decisão comercial.'
  ),
  false
),
(
  'pro',
  'Pro',
  'active',
  74990,
  'BRL',
  'month',
  jsonb_build_object(
    'modules', jsonb_build_array('dashboard','crm','operacao','estoque','financeiro','equipe','configuracoes'),
    'includesConsulting', false,
    'requiresSalesContact', false,
    'trialDays', 14,
    'recommended', false,
    'displayOrder', 3,
    'description', 'Pro',
    'note', 'Entitlements CORE até decisão comercial.'
  ),
  false
),
(
  'pro_plus_consulting',
  'Pro Plus + Consultoria',
  'active',
  349990,
  'BRL',
  'month',
  jsonb_build_object(
    'modules', jsonb_build_array('dashboard','crm','operacao','estoque','financeiro','equipe','configuracoes'),
    'includesConsulting', true,
    'requiresSalesContact', true,
    'trialDays', null,
    'recommended', false,
    'displayOrder', 4,
    'description', 'Pro Plus + Consultoria',
    'note', 'Componente de consultoria humana. Sem trial automático. Não automatiza prestação de serviço.'
  ),
  false
)
on conflict (slug) do update set
  name = excluded.name,
  status = excluded.status,
  amount_cents = excluded.amount_cents,
  currency = excluded.currency,
  billing_interval = excluded.billing_interval,
  entitlements = excluded.entitlements,
  is_pilot = false,
  updated_at = now();

comment on table public.billing_plans is
  'Sprint 33.7 — catálogo SaaS + piloto. Preços comerciais em amount_cents. R$ 19,90 = só homologação sandbox do plano pilot.';
