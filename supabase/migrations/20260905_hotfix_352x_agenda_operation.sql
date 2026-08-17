-- Hotfix 35.2.x — Agenda → operação: veículo no agendamento
-- Aditivo · idempotente · RLS herdado · tenant-safe · sem DELETE / DROP TABLE
-- NÃO executar automaticamente em production.

alter table public.agenda_eventos
  add column if not exists veiculo_id uuid references public.veiculos(id);

create index if not exists idx_agenda_eventos_tenant_veiculo
  on public.agenda_eventos (tenant_id, veiculo_id)
  where veiculo_id is not null and deleted_at is null;

comment on column public.agenda_eventos.veiculo_id is
  'Hotfix 35.2.x — veículo escolhido no agendamento. OS/atendimento só na chegada/início.';
