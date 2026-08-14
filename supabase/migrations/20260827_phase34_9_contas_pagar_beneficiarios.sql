-- Sprint 34.9 — Beneficiários de Contas a Pagar (aditivo, tenant-safe)
-- NÃO edita migrations históricas.
-- NÃO executar em production automaticamente — Renato aplica após revisão.
-- Idempotente. Sem DELETE. Sem perda de dados.
-- Mantém fornecedor_id / fornecedor_nome intactos (legado).

-- ---------------------------------------------------------------------------
-- 1) Cadastro reutilizável de beneficiários (não-fornecedor / não-mecânico)
-- ---------------------------------------------------------------------------
create table if not exists public.financeiro_beneficiarios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  tipo text not null
    check (
      tipo in (
        'prestador',
        'locador',
        'concessionaria',
        'governo',
        'outro'
      )
    ),
  documento text null,
  telefone text null,
  email text null,
  observacoes text null,
  ativo boolean not null default true,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_financeiro_beneficiarios_tenant
  on public.financeiro_beneficiarios (tenant_id)
  where deleted_at is null;

create index if not exists idx_financeiro_beneficiarios_tenant_tipo
  on public.financeiro_beneficiarios (tenant_id, tipo)
  where deleted_at is null and ativo = true;

create index if not exists idx_financeiro_beneficiarios_nome
  on public.financeiro_beneficiarios (tenant_id, lower(nome))
  where deleted_at is null;

comment on table public.financeiro_beneficiarios is
  'Sprint 34.9 — Beneficiários reutilizáveis de Contas a Pagar (prestador/locador/concessionária/governo/outro). Não substitui fornecedores nem mecânicos.';

-- ---------------------------------------------------------------------------
-- 2) Colunas tipadas em contas_pagar (legado preservado)
-- ---------------------------------------------------------------------------
alter table public.contas_pagar
  add column if not exists beneficiario_tipo text null;

alter table public.contas_pagar
  add column if not exists beneficiario_id uuid null
    references public.financeiro_beneficiarios (id) on delete set null;

alter table public.contas_pagar
  add column if not exists mecanico_id uuid null;

alter table public.contas_pagar
  add column if not exists beneficiario_profile_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contas_pagar_beneficiario_tipo_check'
  ) then
    alter table public.contas_pagar
      add constraint contas_pagar_beneficiario_tipo_check
      check (
        beneficiario_tipo is null
        or beneficiario_tipo in (
          'fornecedor',
          'funcionario',
          'mecanico',
          'vendedor',
          'prestador',
          'locador',
          'concessionaria',
          'governo',
          'outro'
        )
      );
  end if;
end $$;

-- FK opcional para mecanicos se a tabela existir
do $$
begin
  if to_regclass('public.mecanicos') is not null
     and not exists (
       select 1 from pg_constraint where conname = 'contas_pagar_mecanico_id_fkey'
     ) then
    alter table public.contas_pagar
      add constraint contas_pagar_mecanico_id_fkey
      foreign key (mecanico_id) references public.mecanicos (id) on delete set null;
  end if;
end $$;

create index if not exists idx_contas_pagar_beneficiario_id
  on public.contas_pagar (tenant_id, beneficiario_id)
  where deleted_at is null and beneficiario_id is not null;

create index if not exists idx_contas_pagar_mecanico_id
  on public.contas_pagar (tenant_id, mecanico_id)
  where deleted_at is null and mecanico_id is not null;

create index if not exists idx_contas_pagar_beneficiario_tipo
  on public.contas_pagar (tenant_id, beneficiario_tipo)
  where deleted_at is null and beneficiario_tipo is not null;

comment on column public.contas_pagar.beneficiario_tipo is
  'Sprint 34.9 — Tipo do beneficiário do pagamento. Null = legado (fornecedor/livre).';
comment on column public.contas_pagar.beneficiario_id is
  'Sprint 34.9 — FK financeiro_beneficiarios quando tipo é prestador/locador/concessionaria/governo/outro.';
comment on column public.contas_pagar.mecanico_id is
  'Sprint 34.9 — Mecânico selecionado (não duplica em fornecedores).';
comment on column public.contas_pagar.beneficiario_profile_id is
  'Sprint 34.9 — Profile/user da equipe (funcionário/vendedor). Soft ref.';

-- ---------------------------------------------------------------------------
-- 3) RLS — alinhado a finance 33.1 quando helpers existem; senão membership ativa
-- ---------------------------------------------------------------------------
alter table public.financeiro_beneficiarios enable row level security;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = '_gof_apply_finance_rls_table'
  ) then
    perform public._gof_apply_finance_rls_table(
      'financeiro_beneficiarios',
      array[]::text[]
    );
  else
    drop policy if exists "financeiro_beneficiarios_select" on public.financeiro_beneficiarios;
    drop policy if exists "financeiro_beneficiarios_write" on public.financeiro_beneficiarios;

    create policy "financeiro_beneficiarios_select"
      on public.financeiro_beneficiarios for select
      using (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = financeiro_beneficiarios.tenant_id
            and tm.user_id = auth.uid()
            and (tm.status is null or tm.status = 'active')
            and tm.deactivated_at is null
        )
      );

    create policy "financeiro_beneficiarios_write"
      on public.financeiro_beneficiarios for all
      using (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = financeiro_beneficiarios.tenant_id
            and tm.user_id = auth.uid()
            and tm.role in ('owner', 'admin', 'manager')
            and (tm.status is null or tm.status = 'active')
            and tm.deactivated_at is null
        )
      )
      with check (
        exists (
          select 1 from public.tenant_members tm
          where tm.tenant_id = financeiro_beneficiarios.tenant_id
            and tm.user_id = auth.uid()
            and tm.role in ('owner', 'admin', 'manager')
            and (tm.status is null or tm.status = 'active')
            and tm.deactivated_at is null
        )
      );
  end if;
end $$;
