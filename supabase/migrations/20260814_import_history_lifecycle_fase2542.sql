-- Sprint 25.4.2 — Lifecycle do histórico de importações (arquivar / soft-delete)
-- Idempotente. NÃO executar automaticamente nesta sprint — aplicar manualmente no Supabase.
-- Não altera migrations anteriores. Soft-delete padrão: nunca apaga fisicamente o histórico.

-- Colunas de arquivamento / soft-delete / motivo
alter table public.import_runs
  add column if not exists archived_at timestamptz null;

alter table public.import_runs
  add column if not exists archived_by uuid null references public.profiles (id) on delete set null;

alter table public.import_runs
  add column if not exists deleted_at timestamptz null;

alter table public.import_runs
  add column if not exists deleted_by uuid null references public.profiles (id) on delete set null;

alter table public.import_runs
  add column if not exists delete_reason text null;

alter table public.import_runs
  add column if not exists rollback_by uuid null references public.profiles (id) on delete set null;

-- Índice: listagens ativas (não arquivadas / não soft-deleted)
create index if not exists idx_import_runs_tenant_active
  on public.import_runs (tenant_id, created_at desc)
  where deleted_at is null and archived_at is null;

create index if not exists idx_import_runs_tenant_archived
  on public.import_runs (tenant_id, archived_at desc)
  where archived_at is not null and deleted_at is null;

create index if not exists idx_import_runs_tenant_deleted
  on public.import_runs (tenant_id, deleted_at desc)
  where deleted_at is not null;

-- Comentários de retenção
comment on column public.import_runs.archived_at is
  'Sprint 25.4.2 — oculto da visão padrão; auditoria preservada.';
comment on column public.import_runs.deleted_at is
  'Sprint 25.4.2 — soft-delete do histórico visual; dados operacionais intactos.';
comment on column public.import_runs.delete_reason is
  'Motivo obrigatório ao arquivar/excluir do histórico.';
comment on column public.import_runs.rollback_by is
  'Utilizador que executou o desfazer (além de import_rollback_events.requested_by).';

-- RLS já existente em import_runs (tenant isolation) continua a aplicar-se às novas colunas.
