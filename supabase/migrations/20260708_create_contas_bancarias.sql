-- Migration: Contas Bancárias (estrutura financeira)
-- Execute manualmente no Supabase SQL Editor

create table if not exists public.contas_bancarias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  tipo text not null default 'corrente'
    check (tipo in ('corrente', 'poupanca', 'investimento', 'caixa', 'outros')),
  banco text,
  agencia text,
  conta text,
  titular text,
  saldo_inicial numeric(15, 2) not null default 0,
  observacoes text,
  ativo boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contas_bancarias_tenant_id on public.contas_bancarias (tenant_id);
create index if not exists idx_contas_bancarias_deleted_at on public.contas_bancarias (deleted_at);
create index if not exists idx_contas_bancarias_nome on public.contas_bancarias (nome);
create index if not exists idx_contas_bancarias_tipo on public.contas_bancarias (tipo);
create index if not exists idx_contas_bancarias_ativo on public.contas_bancarias (ativo);

create unique index if not exists contas_bancarias_tenant_nome_unique
  on public.contas_bancarias (tenant_id, nome)
  where deleted_at is null;

create or replace function public.set_contas_bancarias_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_contas_bancarias_updated_at on public.contas_bancarias;
create trigger trg_contas_bancarias_updated_at
  before update on public.contas_bancarias
  for each row execute function public.set_contas_bancarias_updated_at();

alter table public.contas_bancarias enable row level security;

drop policy if exists "Membros gerenciam contas bancarias da empresa" on public.contas_bancarias;
create policy "Membros gerenciam contas bancarias da empresa"
  on public.contas_bancarias for all
  using (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = contas_bancarias.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = contas_bancarias.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.contas_bancarias is 'Contas bancárias e caixas por tenant';
