-- Painel Executivo: planejamento (metas/orçamento/plano de ação) e notas de peças por tenant.
-- Os números "realizados" do painel vêm das tabelas operacionais; aqui ficam só os dados de planejamento
-- e o detalhe de notas de peças (aba NotasPecas da planilha de oficinas).

create table if not exists public.painel_planejamento (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  chave text not null,
  payload jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  primary key (tenant_id, chave)
);

create table if not exists public.painel_notas_pecas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  data date not null,
  nota text,
  fornecedor text,
  peca text,
  os_ref text,
  quantidade numeric(14, 3),
  unidade text,
  total numeric(14, 2) not null default 0,
  receita numeric(14, 2),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_painel_notas_pecas_tenant_data
  on public.painel_notas_pecas (tenant_id, data desc) where deleted_at is null;

alter table public.painel_planejamento enable row level security;
alter table public.painel_notas_pecas enable row level security;

drop policy if exists "Membros gerenciam planejamento do painel" on public.painel_planejamento;
create policy "Membros gerenciam planejamento do painel"
  on public.painel_planejamento for all
  using (exists (select 1 from public.tenant_members tm where tm.tenant_id = painel_planejamento.tenant_id and tm.user_id = auth.uid()))
  with check (exists (select 1 from public.tenant_members tm where tm.tenant_id = painel_planejamento.tenant_id and tm.user_id = auth.uid()));

drop policy if exists "Membros gerenciam notas de peças do painel" on public.painel_notas_pecas;
create policy "Membros gerenciam notas de peças do painel"
  on public.painel_notas_pecas for all
  using (exists (select 1 from public.tenant_members tm where tm.tenant_id = painel_notas_pecas.tenant_id and tm.user_id = auth.uid()))
  with check (exists (select 1 from public.tenant_members tm where tm.tenant_id = painel_notas_pecas.tenant_id and tm.user_id = auth.uid()));

comment on table public.painel_planejamento is 'Planejamento do Painel Executivo por tenant (chave → JSON): metas do mês, premissas, orçamento, plano de ação.';
comment on table public.painel_notas_pecas is 'Itens de notas de compra de peças usados no Painel Executivo.';
