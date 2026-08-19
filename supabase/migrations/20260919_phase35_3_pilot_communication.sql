-- Sprint 35.3 — flags de piloto (defaults OFF). Aditivo · sem DROP · sem DELETE.
-- Não executar automaticamente em production.

alter table public.communication_tenant_settings
  add column if not exists send_appointment_confirmed boolean not null default false;

alter table public.communication_tenant_settings
  add column if not exists send_budget_published boolean not null default false;

comment on column public.communication_tenant_settings.send_appointment_confirmed is
  'Sprint 35.3 — AGENDAMENTO_CONFIRMADO. Default OFF.';

comment on column public.communication_tenant_settings.send_budget_published is
  'Sprint 35.3 — BUDGET_PUBLISHED. Default OFF. Não liga tenants existentes.';
