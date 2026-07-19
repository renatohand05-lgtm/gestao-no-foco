-- Sprint 13.16 — Enterprise Master Data Foundation
-- Execute MANUALMENTE no Supabase SQL Editor
-- NÃO alterar migrations antigas; NÃO apagar dados
-- Idempotente quando possível

-- =============================================================================
-- 1) Fornecedores — enriquecimento para Master Data / autopreenchimento
-- =============================================================================
alter table public.fornecedores
  add column if not exists nome_fantasia text;

alter table public.fornecedores
  add column if not exists tipo_pessoa text;

alter table public.fornecedores
  drop constraint if exists fornecedores_tipo_pessoa_check;
alter table public.fornecedores
  add constraint fornecedores_tipo_pessoa_check
  check (tipo_pessoa is null or tipo_pessoa in ('pf', 'pj'));

alter table public.fornecedores add column if not exists cep text;
alter table public.fornecedores add column if not exists rua text;
alter table public.fornecedores add column if not exists numero text;
alter table public.fornecedores add column if not exists complemento text;
alter table public.fornecedores add column if not exists bairro text;
alter table public.fornecedores add column if not exists cidade text;
alter table public.fornecedores add column if not exists estado text;

alter table public.fornecedores
  drop constraint if exists fornecedores_estado_check;
alter table public.fornecedores
  add constraint fornecedores_estado_check
  check (estado is null or char_length(estado) = 2);

alter table public.fornecedores
  add column if not exists categoria_financeira_id uuid
  references public.categorias_financeiras (id) on delete set null;

alter table public.fornecedores
  add column if not exists plano_conta_id uuid
  references public.plano_contas (id) on delete set null;

alter table public.fornecedores
  add column if not exists centro_custo_id uuid
  references public.centros_custo (id) on delete set null;

alter table public.fornecedores
  add column if not exists forma_pagamento_id uuid
  references public.formas_pagamento (id) on delete set null;

alter table public.fornecedores
  add column if not exists conta_bancaria_id uuid
  references public.contas_bancarias (id) on delete set null;

alter table public.fornecedores
  add column if not exists prazo_medio_dias integer;

alter table public.fornecedores
  drop constraint if exists fornecedores_prazo_check;
alter table public.fornecedores
  add constraint fornecedores_prazo_check
  check (prazo_medio_dias is null or prazo_medio_dias >= 0);

alter table public.fornecedores
  add column if not exists recorrente boolean not null default false;

alter table public.fornecedores
  add column if not exists frequencia text;

alter table public.fornecedores
  drop constraint if exists fornecedores_frequencia_check;
alter table public.fornecedores
  add constraint fornecedores_frequencia_check
  check (
    frequencia is null
    or frequencia in ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual', 'semanal')
  );

alter table public.fornecedores
  add column if not exists observacoes text;

create index if not exists idx_fornecedores_categoria
  on public.fornecedores (categoria_financeira_id)
  where deleted_at is null and categoria_financeira_id is not null;

create index if not exists idx_fornecedores_nome_fantasia
  on public.fornecedores (tenant_id, nome_fantasia)
  where deleted_at is null and nome_fantasia is not null;

comment on table public.fornecedores is
  'Cadastro mestre de fornecedores (Sprint 13.16). Defaults financeiros alimentam autopreenchimento em Contas a Pagar.';

-- =============================================================================
-- 2) Clientes — campos leves de segmentação (sem métricas novas)
-- =============================================================================
alter table public.clientes add column if not exists razao_social text;
alter table public.clientes add column if not exists segmento text;
alter table public.clientes add column if not exists porte text;
alter table public.clientes add column if not exists origem text;

-- =============================================================================
-- 3) Centros de custo — classificação operacional leve
-- =============================================================================
alter table public.centros_custo add column if not exists tipo text;
alter table public.centros_custo
  drop constraint if exists centros_custo_tipo_check;
alter table public.centros_custo
  add constraint centros_custo_tipo_check
  check (
    tipo is null
    or tipo in (
      'operacional',
      'administrativo',
      'comercial',
      'producao',
      'outro'
    )
  );

alter table public.centros_custo add column if not exists departamento text;
alter table public.centros_custo add column if not exists unidade text;
alter table public.centros_custo add column if not exists filial text;

-- =============================================================================
-- 4) Tags reutilizáveis
-- =============================================================================
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  slug text not null,
  cor text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists tags_tenant_slug_unique
  on public.tags (tenant_id, slug)
  where deleted_at is null;

create index if not exists idx_tags_tenant
  on public.tags (tenant_id)
  where deleted_at is null;

create or replace function public.set_tags_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tags_updated_at on public.tags;
create trigger trg_tags_updated_at
  before update on public.tags
  for each row execute function public.set_tags_updated_at();

alter table public.tags enable row level security;

drop policy if exists "Membros gerenciam tags do tenant" on public.tags;
create policy "Membros gerenciam tags do tenant"
  on public.tags for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tags.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tags.tenant_id and tm.user_id = auth.uid()
    )
  );

create table if not exists public.entity_tags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  constraint entity_tags_type_check
    check (
      entity_type in (
        'fornecedor',
        'cliente',
        'produto',
        'categoria',
        'plano',
        'centro_custo'
      )
    )
);

create unique index if not exists entity_tags_unique
  on public.entity_tags (tenant_id, tag_id, entity_type, entity_id);

create index if not exists idx_entity_tags_entity
  on public.entity_tags (tenant_id, entity_type, entity_id);

alter table public.entity_tags enable row level security;

drop policy if exists "Membros gerenciam entity_tags do tenant"
  on public.entity_tags;
create policy "Membros gerenciam entity_tags do tenant"
  on public.entity_tags for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = entity_tags.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = entity_tags.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.tags is 'Tags reutilizáveis por tenant (Master Data 13.16).';
comment on table public.entity_tags is 'Vínculo polimórfico tag ↔ entidade mestre.';
