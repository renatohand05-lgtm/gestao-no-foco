-- Migration incremental: Clientes enterprise
-- Execute manualmente no Supabase SQL Editor
-- Não recria a tabela. Mantém tenant_id, deleted_at e RLS existente.

alter table public.clientes
  add column if not exists whatsapp text,
  add column if not exists data_referencia date,
  add column if not exists cep text,
  add column if not exists rua text,
  add column if not exists numero text,
  add column if not exists complemento text,
  add column if not exists bairro text,
  add column if not exists cidade text,
  add column if not exists estado text,
  add column if not exists ativo boolean not null default true;

comment on column public.clientes.data_referencia is 'Data de nascimento (PF) ou abertura (PJ)';
comment on column public.clientes.nome is 'Nome completo (PF) ou razão social (PJ)';

create index if not exists idx_clientes_cidade on public.clientes (cidade);
create index if not exists idx_clientes_ativo on public.clientes (ativo);
create index if not exists idx_clientes_whatsapp on public.clientes (whatsapp);

alter table public.clientes
  drop constraint if exists clientes_estado_length_check;

alter table public.clientes
  add constraint clientes_estado_length_check
  check (estado is null or char_length(estado) = 2);
