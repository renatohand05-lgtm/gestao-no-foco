-- =============================================================================
-- Fase 28.1 — CRM Enterprise V2 (campos lead / consentimento / oportunidade)
-- Sprint 28.6.1 — CORRIGIDA (idempotente · defensiva · schema real)
--
-- Causa raiz da falha anterior:
--   O bloco DO adicionava FK em public.crm_oportunidades sem verificar
--   to_regclass('public.crm_oportunidades'). A tabela canônica existe no
--   código/types e é criada por 20260812_crm_enterprise_fase24.sql, mas
--   pode estar ausente se a Fase 24 não foi aplicada neste projeto.
--
-- Tabela canônica: public.crm_oportunidades (NÃO há alias oportunidades_crm).
-- Leads: public.clientes com estagio_funil = 'lead' (sem tabela leads).
--
-- Seguro reexecutar do início (IF NOT EXISTS / checagens pg_*).
-- NÃO executar automaticamente — aplicar manualmente no SQL Editor.
-- =============================================================================

/* ─── 0. Pré-requisito / self-heal: oportunidades (canônica Fase 24) ─────── */

create table if not exists public.crm_oportunidades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  empresa_id uuid,
  filial_id uuid,
  titulo text not null,
  stage_key text not null default 'lead',
  valor_estimado numeric(14, 2)
    check (valor_estimado is null or valor_estimado >= 0),
  probabilidade integer
    check (probabilidade is null or (probabilidade >= 0 and probabilidade <= 100)),
  data_prevista date,
  data_fechamento date,
  origem text,
  responsavel_id uuid references public.profiles (id) on delete set null,
  produto_servico text,
  status text not null default 'aberta'
    check (status in ('aberta', 'ganha', 'perdida', 'cancelada')),
  motivo_perda text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint crm_oportunidades_ganha_tem_fechamento
    check (status <> 'ganha' or data_fechamento is not null)
);

create index if not exists idx_crm_oportunidades_tenant_cliente
  on public.crm_oportunidades (tenant_id, cliente_id)
  where deleted_at is null;

create index if not exists idx_crm_oportunidades_stage
  on public.crm_oportunidades (tenant_id, stage_key, status)
  where deleted_at is null;

alter table public.crm_oportunidades enable row level security;

do $$
begin
  if to_regclass('public.crm_oportunidades') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'crm_oportunidades'
         and policyname = 'Membros gerenciam oportunidades CRM'
     )
  then
    create policy "Membros gerenciam oportunidades CRM"
      on public.crm_oportunidades for all
      using (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = crm_oportunidades.tenant_id
            and tm.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = crm_oportunidades.tenant_id
            and tm.user_id = auth.uid()
        )
      );
  end if;
end $$;

comment on table public.crm_oportunidades is
  'Canônica CRM — oportunidades vinculadas a clientes (Fase 24 / self-heal 28.6.1).';

/* ─── 1. Campos lead/cliente (base única public.clientes) ───────────────── */

do $$
begin
  if to_regclass('public.clientes') is null then
    raise notice '28.6.1: public.clientes ausente — pulando colunas lead/CRM.';
    return;
  end if;

  alter table public.clientes
    add column if not exists consentimento_contato boolean not null default false;

  alter table public.clientes
    add column if not exists origem_contato_detalhe text;

  alter table public.clientes
    add column if not exists prioridade_crm text;

  alter table public.clientes
    add column if not exists valor_potencial numeric(14, 2);

  alter table public.clientes
    add column if not exists proxima_acao text;

  alter table public.clientes
    add column if not exists data_proxima_acao date;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clientes'
      and column_name = 'consentimento_contato'
  ) then
    comment on column public.clientes.consentimento_contato is
      'Fase 28.1 — consentimento LGPD/contato comercial.';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clientes'
      and column_name = 'prioridade_crm'
  ) then
    comment on column public.clientes.prioridade_crm is
      'Fase 28.1 — prioridade do lead/cliente no CRM (baixa|media|alta|critica).';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clientes'
      and column_name = 'origem_contato_detalhe'
  ) then
    comment on column public.clientes.origem_contato_detalhe is
      'Fase 28.1 — detalhe da origem do contato (canal/campanha).';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clientes'
      and column_name = 'valor_potencial'
  ) then
    comment on column public.clientes.valor_potencial is
      'Fase 28.1 — valor potencial estimado do lead/cliente.';
  end if;
end $$;

/* ─── 2. Campos oportunidade (somente se tabela canônica existir) ───────── */

do $$
begin
  if to_regclass('public.crm_oportunidades') is null then
    raise notice '28.6.1: public.crm_oportunidades ausente — pulando colunas oportunidade.';
    return;
  end if;

  alter table public.crm_oportunidades
    add column if not exists centro_custo_id uuid;

  alter table public.crm_oportunidades
    add column if not exists tags text[];
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'crm_oportunidades'
      and column_name = 'centro_custo_id'
  ) then
    comment on column public.crm_oportunidades.centro_custo_id is
      'Fase 28.1 — centro de custo opcional da oportunidade.';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'crm_oportunidades'
      and column_name = 'tags'
  ) then
    comment on column public.crm_oportunidades.tags is
      'Fase 28.1 — tags textuais da oportunidade.';
  end if;
end $$;

/* ─── 3. FK centro_custo (defensiva: tabela + coluna + alvo + constraint) ─ */

do $$
begin
  if to_regclass('public.crm_oportunidades') is null then
    raise notice '28.6.1: FK centro_custo pulada — crm_oportunidades ausente.';
    return;
  end if;

  if to_regclass('public.centros_custo') is null then
    raise notice '28.6.1: FK centro_custo pulada — centros_custo ausente.';
    return;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'crm_oportunidades'
      and column_name = 'centro_custo_id'
  ) then
    raise notice '28.6.1: FK centro_custo pulada — coluna centro_custo_id ausente.';
    return;
  end if;

  if exists (
    select 1 from pg_constraint
    where conname = 'crm_oportunidades_centro_custo_fk'
  ) then
    raise notice '28.6.1: FK crm_oportunidades_centro_custo_fk já existe.';
    return;
  end if;

  alter table public.crm_oportunidades
    add constraint crm_oportunidades_centro_custo_fk
    foreign key (centro_custo_id)
    references public.centros_custo (id)
    on delete set null;
end $$;

/* ─── 4. Índice auxiliar (idempotente) ──────────────────────────────────── */

do $$
begin
  if to_regclass('public.crm_oportunidades') is null then
    return;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'crm_oportunidades'
      and column_name = 'centro_custo_id'
  ) then
    create index if not exists idx_crm_oportunidades_centro_custo
      on public.crm_oportunidades (tenant_id, centro_custo_id)
      where deleted_at is null and centro_custo_id is not null;
  end if;
end $$;
