-- Migration: Formas de Pagamento (estrutura financeira)
-- Execute manualmente no Supabase SQL Editor

create table if not exists public.formas_pagamento (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  tipo text not null default 'outros'
    check (
      tipo in (
        'dinheiro',
        'pix',
        'cartao_credito',
        'cartao_debito',
        'boleto',
        'transferencia',
        'cheque',
        'outros'
      )
    ),
  gera_financeiro boolean not null default true,
  dias_compensacao integer not null default 0,
  taxa_percent numeric(8, 4),
  observacoes text,
  ativo boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_formas_pagamento_tenant_id on public.formas_pagamento (tenant_id);
create index if not exists idx_formas_pagamento_deleted_at on public.formas_pagamento (deleted_at);
create index if not exists idx_formas_pagamento_nome on public.formas_pagamento (nome);
create index if not exists idx_formas_pagamento_tipo on public.formas_pagamento (tipo);
create index if not exists idx_formas_pagamento_ativo on public.formas_pagamento (ativo);

create unique index if not exists formas_pagamento_tenant_nome_unique
  on public.formas_pagamento (tenant_id, nome)
  where deleted_at is null;

create or replace function public.set_formas_pagamento_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_formas_pagamento_updated_at on public.formas_pagamento;
create trigger trg_formas_pagamento_updated_at
  before update on public.formas_pagamento
  for each row execute function public.set_formas_pagamento_updated_at();

alter table public.formas_pagamento enable row level security;

drop policy if exists "Membros gerenciam formas de pagamento da empresa" on public.formas_pagamento;
create policy "Membros gerenciam formas de pagamento da empresa"
  on public.formas_pagamento for all
  using (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = formas_pagamento.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = formas_pagamento.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.formas_pagamento is 'Formas de pagamento financeiras por tenant';
