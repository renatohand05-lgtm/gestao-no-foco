-- Migration: Fornecedores (mínimo) + Contas a Pagar (módulo financeiro)
-- Execute manualmente no Supabase SQL Editor
-- Requer: tenants, plano_contas, formas_pagamento, categorias_financeiras, centros_custo, contas_bancarias

/* ─── Fornecedores (cadastro mínimo para vínculo) ─────────────────── */

create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  documento text,
  email text,
  telefone text,
  ativo boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fornecedores_tenant_id on public.fornecedores (tenant_id);
create index if not exists idx_fornecedores_deleted_at on public.fornecedores (deleted_at);
create index if not exists idx_fornecedores_nome on public.fornecedores (nome);

create unique index if not exists fornecedores_tenant_documento_unique
  on public.fornecedores (tenant_id, documento)
  where deleted_at is null and documento is not null;

create or replace function public.set_fornecedores_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_fornecedores_updated_at on public.fornecedores;
create trigger trg_fornecedores_updated_at
  before update on public.fornecedores
  for each row execute function public.set_fornecedores_updated_at();

alter table public.fornecedores enable row level security;

drop policy if exists "Membros gerenciam fornecedores da empresa" on public.fornecedores;
create policy "Membros gerenciam fornecedores da empresa"
  on public.fornecedores for all
  using (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = fornecedores.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = fornecedores.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.fornecedores is 'Cadastro mínimo de fornecedores por tenant (CRUD completo em sprint futuro)';

/* ─── Contas a Pagar ─────────────────────────────────────────────── */

create table if not exists public.contas_pagar (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  numero bigint generated always as identity,
  fornecedor_id uuid references public.fornecedores (id) on delete set null,
  fornecedor_nome text,
  forma_pagamento_id uuid references public.formas_pagamento (id) on delete set null,
  categoria_financeira_id uuid references public.categorias_financeiras (id) on delete set null,
  centro_custo_id uuid references public.centros_custo (id) on delete set null,
  plano_conta_id uuid references public.plano_contas (id) on delete set null,
  conta_bancaria_id uuid references public.contas_bancarias (id) on delete set null,
  descricao text not null,
  grupo_parcelamento_id uuid,
  parcela_numero integer not null default 1 check (parcela_numero >= 1),
  parcela_total integer not null default 1 check (parcela_total >= 1),
  status text not null default 'aberto'
    check (status in ('aberto', 'pago', 'cancelado', 'parcial')),
  valor_original numeric(15, 2) not null check (valor_original >= 0),
  desconto numeric(15, 2) not null default 0 check (desconto >= 0),
  juros numeric(15, 2) not null default 0 check (juros >= 0),
  multa numeric(15, 2) not null default 0 check (multa >= 0),
  valor_pago numeric(15, 2) not null default 0 check (valor_pago >= 0),
  data_emissao date not null default current_date,
  data_competencia date not null default current_date,
  data_vencimento date not null,
  data_pagamento date,
  observacoes text,
  anexos_metadata jsonb not null default '[]'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contas_pagar_parcela_check check (parcela_numero <= parcela_total)
);

create index if not exists idx_contas_pagar_tenant_id on public.contas_pagar (tenant_id);
create index if not exists idx_contas_pagar_deleted_at on public.contas_pagar (deleted_at);
create index if not exists idx_contas_pagar_fornecedor_id on public.contas_pagar (fornecedor_id);
create index if not exists idx_contas_pagar_status on public.contas_pagar (status);
create index if not exists idx_contas_pagar_data_vencimento on public.contas_pagar (data_vencimento);
create index if not exists idx_contas_pagar_data_competencia on public.contas_pagar (data_competencia);
create index if not exists idx_contas_pagar_grupo_parcelamento on public.contas_pagar (grupo_parcelamento_id);
create index if not exists idx_contas_pagar_numero on public.contas_pagar (numero);
create index if not exists idx_contas_pagar_plano_conta_id on public.contas_pagar (plano_conta_id);

create or replace function public.set_contas_pagar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_contas_pagar_updated_at on public.contas_pagar;
create trigger trg_contas_pagar_updated_at
  before update on public.contas_pagar
  for each row execute function public.set_contas_pagar_updated_at();

alter table public.contas_pagar enable row level security;

drop policy if exists "Membros gerenciam contas a pagar da empresa" on public.contas_pagar;
create policy "Membros gerenciam contas a pagar da empresa"
  on public.contas_pagar for all
  using (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = contas_pagar.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = contas_pagar.tenant_id
        and tm.user_id = auth.uid()
    )
  );

comment on table public.contas_pagar is 'Títulos a pagar por tenant';
comment on column public.contas_pagar.fornecedor_nome is 'Nome livre quando não há cadastro de fornecedor';
comment on column public.contas_pagar.anexos_metadata is 'Estrutura reservada para anexos futuros (upload não implementado)';
comment on column public.contas_pagar.conta_bancaria_id is 'Conta utilizada na baixa — preparação para fluxo de caixa';
