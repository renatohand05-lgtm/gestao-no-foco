-- Migration: módulo Clientes
-- Execute manualmente no Supabase SQL Editor

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  email text,
  telefone text,
  documento text,
  tipo_pessoa text not null default 'pf' check (tipo_pessoa in ('pf', 'pj')),
  observacoes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clientes_tenant_id on public.clientes (tenant_id);
create index if not exists idx_clientes_deleted_at on public.clientes (deleted_at);
create index if not exists idx_clientes_nome on public.clientes (nome);
create index if not exists idx_clientes_documento on public.clientes (documento);

create unique index if not exists clientes_tenant_documento_unique
  on public.clientes (tenant_id, documento)
  where deleted_at is null and documento is not null;

create or replace function public.set_clientes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clientes_updated_at on public.clientes;
create trigger trg_clientes_updated_at
  before update on public.clientes
  for each row execute function public.set_clientes_updated_at();

alter table public.clientes enable row level security;

drop policy if exists "Membros gerenciam clientes da empresa" on public.clientes;
create policy "Membros gerenciam clientes da empresa"
  on public.clientes for all
  using (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = clientes.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = clientes.tenant_id
        and tm.user_id = auth.uid()
    )
  );
