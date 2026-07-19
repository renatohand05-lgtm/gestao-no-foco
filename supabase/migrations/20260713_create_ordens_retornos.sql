-- Migration: Ordens de Serviço e Retornos (Qualidade Operacional)
-- Execute manualmente no Supabase SQL Editor

create table if not exists public.veiculos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  placa text not null,
  marca text,
  modelo text,
  ano int,
  cor text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  numero bigint generated always as identity,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  veiculo_id uuid references public.veiculos (id) on delete set null,
  status text not null default 'aberta'
    check (status in ('aberta', 'em_execucao', 'concluida', 'cancelada')),
  mecanico_id uuid references public.profiles (id) on delete set null,
  data_abertura date not null default current_date,
  data_conclusao date,
  descricao text,
  valor_total numeric(15, 2) not null default 0,
  venda_id uuid references public.vendas (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status <> 'concluida'
    or data_conclusao is not null
  )
);

create table if not exists public.ordem_servico_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ordem_servico_id uuid not null references public.ordens_servico (id) on delete cascade,
  produto_id uuid references public.produtos (id) on delete set null,
  descricao text not null,
  tipo_item text not null default 'servico'
    check (tipo_item in ('produto', 'servico')),
  mecanico_id uuid references public.profiles (id) on delete set null,
  quantidade numeric(15, 3) not null default 1 check (quantidade > 0),
  valor_unitario numeric(15, 2) not null default 0 check (valor_unitario >= 0),
  valor_total numeric(15, 2) not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.retornos_servico (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  numero bigint generated always as identity,
  ordem_servico_id uuid not null references public.ordens_servico (id) on delete restrict,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  veiculo_id uuid references public.veiculos (id) on delete set null,
  mecanico_id uuid references public.profiles (id) on delete set null,
  servico_produto_id uuid references public.produtos (id) on delete set null,
  categoria_id uuid references public.categorias_financeiras (id) on delete set null,
  data_retorno date not null default current_date,
  data_servico_original date not null,
  motivo text not null,
  valor_retorno numeric(15, 2) not null default 0 check (valor_retorno >= 0),
  valor_pecas_garantia numeric(15, 2) not null default 0 check (valor_pecas_garantia >= 0),
  horas_mao_obra numeric(8, 2) not null default 0 check (horas_mao_obra >= 0),
  valor_mao_obra numeric(15, 2) not null default 0 check (valor_mao_obra >= 0),
  tipo_cobertura text not null default 'garantia'
    check (tipo_cobertura in ('garantia', 'pago')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_veiculos_tenant_id on public.veiculos (tenant_id);
create index if not exists idx_veiculos_cliente_id on public.veiculos (cliente_id);
create index if not exists idx_veiculos_deleted_at on public.veiculos (deleted_at);

create index if not exists idx_ordens_servico_tenant_id on public.ordens_servico (tenant_id);
create index if not exists idx_ordens_servico_cliente_id on public.ordens_servico (cliente_id);
create index if not exists idx_ordens_servico_veiculo_id on public.ordens_servico (veiculo_id);
create index if not exists idx_ordens_servico_status on public.ordens_servico (status);
create index if not exists idx_ordens_servico_data_conclusao on public.ordens_servico (data_conclusao desc);
create index if not exists idx_ordens_servico_deleted_at on public.ordens_servico (deleted_at);

create index if not exists idx_ordem_servico_itens_tenant_id on public.ordem_servico_itens (tenant_id);
create index if not exists idx_ordem_servico_itens_ordem_id on public.ordem_servico_itens (ordem_servico_id);
create index if not exists idx_ordem_servico_itens_tipo on public.ordem_servico_itens (tipo_item);
create index if not exists idx_ordem_servico_itens_deleted_at on public.ordem_servico_itens (deleted_at);

create index if not exists idx_retornos_servico_tenant_id on public.retornos_servico (tenant_id);
create index if not exists idx_retornos_servico_ordem_id on public.retornos_servico (ordem_servico_id);
create index if not exists idx_retornos_servico_data_retorno on public.retornos_servico (data_retorno desc);
create index if not exists idx_retornos_servico_mecanico_id on public.retornos_servico (mecanico_id);
create index if not exists idx_retornos_servico_servico_produto_id on public.retornos_servico (servico_produto_id);
create index if not exists idx_retornos_servico_deleted_at on public.retornos_servico (deleted_at);

create or replace function public.set_veiculos_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_veiculos_updated_at on public.veiculos;
create trigger trg_veiculos_updated_at
  before update on public.veiculos
  for each row execute function public.set_veiculos_updated_at();

create or replace function public.set_ordens_servico_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ordens_servico_updated_at on public.ordens_servico;
create trigger trg_ordens_servico_updated_at
  before update on public.ordens_servico
  for each row execute function public.set_ordens_servico_updated_at();

create or replace function public.set_retornos_servico_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_retornos_servico_updated_at on public.retornos_servico;
create trigger trg_retornos_servico_updated_at
  before update on public.retornos_servico
  for each row execute function public.set_retornos_servico_updated_at();

alter table public.veiculos enable row level security;
alter table public.ordens_servico enable row level security;
alter table public.ordem_servico_itens enable row level security;
alter table public.retornos_servico enable row level security;

drop policy if exists "Membros gerenciam veiculos da empresa" on public.veiculos;
create policy "Membros gerenciam veiculos da empresa"
  on public.veiculos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = veiculos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = veiculos.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros gerenciam ordens da empresa" on public.ordens_servico;
create policy "Membros gerenciam ordens da empresa"
  on public.ordens_servico for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordens_servico.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordens_servico.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros gerenciam itens de ordem da empresa" on public.ordem_servico_itens;
create policy "Membros gerenciam itens de ordem da empresa"
  on public.ordem_servico_itens for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_itens.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_itens.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros gerenciam retornos da empresa" on public.retornos_servico;
create policy "Membros gerenciam retornos da empresa"
  on public.retornos_servico for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = retornos_servico.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = retornos_servico.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.veiculos is 'Veículos vinculados a clientes (oficinas)';
comment on table public.ordens_servico is 'Ordens de serviço operacionais';
comment on table public.ordem_servico_itens is 'Itens (serviços e peças) de cada ordem de serviço';
comment on table public.retornos_servico is 'Retornos de serviços para qualidade operacional';
