-- Mecânicos, custo de pessoal, vínculo OS, apontamentos e obrigação → CAP → DRE
-- Idempotente. Não lança salário direto no DRE: passa por competência + contas a pagar.
-- Não altera FKs existentes de mecanico_id → profiles (compatibilidade).

/* ─── Cadastro de mecânicos ───────────────────────────────── */

create table if not exists public.mecanicos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  nome_completo text not null,
  cpf text,
  telefone text,
  email text,
  data_nascimento date,
  endereco text,
  foto_url text,
  codigo_interno text,
  funcao text,
  nivel text,
  especialidade text not null default 'mecanica_geral'
    check (especialidade in (
      'mecanica_geral', 'suspensao', 'freios', 'motor', 'cambio',
      'eletrica', 'injecao', 'alinhamento', 'ar_condicionado',
      'diagnostico', 'outras'
    )),
  data_admissao date,
  tipo_vinculo text not null default 'clt'
    check (tipo_vinculo in ('clt', 'pj', 'autonomo', 'comissao', 'diaria', 'outro')),
  unidade_id uuid,
  centro_custo_id uuid references public.centros_custo (id) on delete set null,
  supervisor_id uuid references public.profiles (id) on delete set null,
  status text not null default 'ativo'
    check (status in ('ativo', 'inativo', 'arquivado')),
  disponibilidade text not null default 'disponivel'
    check (disponibilidade in (
      'disponivel', 'ocupado', 'pausa', 'ausente', 'ferias', 'afastado', 'folga'
    )),
  horas_mensais_contratadas numeric(10,2) not null default 176,
  jornada_diaria_horas numeric(6,2) not null default 8,
  observacoes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null
);

create unique index if not exists uq_mecanicos_tenant_codigo
  on public.mecanicos (tenant_id, codigo_interno)
  where deleted_at is null and codigo_interno is not null;

create unique index if not exists uq_mecanicos_tenant_cpf
  on public.mecanicos (tenant_id, cpf)
  where deleted_at is null and cpf is not null;

create unique index if not exists uq_mecanicos_tenant_profile
  on public.mecanicos (tenant_id, profile_id)
  where deleted_at is null and profile_id is not null;

create index if not exists idx_mecanicos_tenant_status
  on public.mecanicos (tenant_id, status)
  where deleted_at is null;

create index if not exists idx_mecanicos_especialidade
  on public.mecanicos (tenant_id, especialidade)
  where deleted_at is null;

alter table public.mecanicos enable row level security;

drop policy if exists "Membros leem mecanicos" on public.mecanicos;
create policy "Membros leem mecanicos"
  on public.mecanicos for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = mecanicos.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Gestores gerenciam mecanicos" on public.mecanicos;
create policy "Gestores gerenciam mecanicos"
  on public.mecanicos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = mecanicos.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = mecanicos.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'manager')
    )
  );

/* ─── Custos por vigência (histórico salarial) ────────────── */

create table if not exists public.mecanico_custos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  mecanico_id uuid not null references public.mecanicos (id) on delete cascade,
  vigencia_inicio date not null,
  vigencia_fim date,
  salario_base numeric(14,2) not null default 0,
  pro_labore numeric(14,2) not null default 0,
  adicional numeric(14,2) not null default 0,
  comissao numeric(14,2) not null default 0,
  horas_extras numeric(14,2) not null default 0,
  beneficios numeric(14,2) not null default 0,
  cesta_basica numeric(14,2) not null default 0,
  vale_transporte numeric(14,2) not null default 0,
  vale_refeicao numeric(14,2) not null default 0,
  encargos numeric(14,2) not null default 0,
  impostos numeric(14,2) not null default 0,
  bonus numeric(14,2) not null default 0,
  descontos numeric(14,2) not null default 0,
  custo_mensal_total numeric(14,2) not null default 0,
  custo_hora numeric(14,4) not null default 0,
  horas_base_calculo numeric(10,2) not null default 176,
  dia_pagamento integer not null default 5 check (dia_pagamento between 1 and 28),
  data_vencimento_padrao integer not null default 5 check (data_vencimento_padrao between 1 and 28),
  gerar_automatico boolean not null default false,
  geracao_pausada boolean not null default false,
  plano_conta_id uuid references public.plano_contas (id) on delete set null,
  categoria_financeira_id uuid references public.categorias_financeiras (id) on delete set null,
  centro_custo_id uuid references public.centros_custo (id) on delete set null,
  conta_bancaria_id uuid references public.contas_bancarias (id) on delete set null,
  forma_pagamento_id uuid references public.formas_pagamento (id) on delete set null,
  observacoes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint mecanico_custos_vigencia_ck
    check (vigencia_fim is null or vigencia_fim >= vigencia_inicio)
);

create index if not exists idx_mecanico_custos_vigencia
  on public.mecanico_custos (tenant_id, mecanico_id, vigencia_inicio desc)
  where deleted_at is null;

-- Uma vigência aberta por mecânico
create unique index if not exists uq_mecanico_custo_aberto
  on public.mecanico_custos (tenant_id, mecanico_id)
  where deleted_at is null and vigencia_fim is null;

alter table public.mecanico_custos enable row level security;

drop policy if exists "Gestores leem custos mecanico" on public.mecanico_custos;
create policy "Gestores leem custos mecanico"
  on public.mecanico_custos for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = mecanico_custos.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'manager')
    )
  );

drop policy if exists "Gestores gerenciam custos mecanico" on public.mecanico_custos;
create policy "Gestores gerenciam custos mecanico"
  on public.mecanico_custos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = mecanico_custos.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = mecanico_custos.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'manager')
    )
  );

/* ─── Competências / obrigações mensais ───────────────────── */

create table if not exists public.mecanico_competencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  mecanico_id uuid not null references public.mecanicos (id) on delete cascade,
  mecanico_custo_id uuid references public.mecanico_custos (id) on delete set null,
  competencia date not null, -- sempre dia 1 do mês
  tipo_obrigacao text not null default 'folha'
    check (tipo_obrigacao in ('folha', 'comissao', 'bonus', 'adiantamento', 'outro')),
  valor numeric(14,2) not null default 0,
  status text not null default 'pendente'
    check (status in ('pendente', 'gerada', 'paga', 'cancelada', 'pausada')),
  data_vencimento date not null,
  categoria_financeira_id uuid references public.categorias_financeiras (id) on delete set null,
  plano_conta_id uuid references public.plano_contas (id) on delete set null,
  centro_custo_id uuid references public.centros_custo (id) on delete set null,
  unidade_id uuid,
  conta_bancaria_id uuid references public.contas_bancarias (id) on delete set null,
  forma_pagamento_id uuid references public.formas_pagamento (id) on delete set null,
  conta_pagar_id uuid references public.contas_pagar (id) on delete set null,
  observacoes text,
  origem text not null default 'mecanico'
    check (origem in ('folha', 'mecanico')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create unique index if not exists uq_mecanico_competencia_unica
  on public.mecanico_competencias (tenant_id, mecanico_id, competencia, tipo_obrigacao)
  where deleted_at is null;

create index if not exists idx_mecanico_competencias_status
  on public.mecanico_competencias (tenant_id, status, competencia)
  where deleted_at is null;

alter table public.mecanico_competencias enable row level security;

drop policy if exists "Gestores leem competencias mecanico" on public.mecanico_competencias;
create policy "Gestores leem competencias mecanico"
  on public.mecanico_competencias for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = mecanico_competencias.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'manager')
    )
  );

drop policy if exists "Gestores gerenciam competencias mecanico" on public.mecanico_competencias;
create policy "Gestores gerenciam competencias mecanico"
  on public.mecanico_competencias for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = mecanico_competencias.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = mecanico_competencias.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'manager')
    )
  );

-- Vínculo reverso na CAP (origem folha/mecânico)
alter table public.contas_pagar
  add column if not exists mecanico_competencia_id uuid
    references public.mecanico_competencias (id) on delete set null;

create index if not exists idx_contas_pagar_mecanico_competencia
  on public.contas_pagar (tenant_id, mecanico_competencia_id)
  where deleted_at is null and mecanico_competencia_id is not null;

/* ─── Config DRE / classificação por tenant ───────────────── */

create table if not exists public.tenant_mecanico_config (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  categoria_folha_id uuid references public.categorias_financeiras (id) on delete set null,
  plano_folha_id uuid references public.plano_contas (id) on delete set null,
  categoria_encargos_id uuid references public.categorias_financeiras (id) on delete set null,
  plano_encargos_id uuid references public.plano_contas (id) on delete set null,
  categoria_beneficios_id uuid references public.categorias_financeiras (id) on delete set null,
  plano_beneficios_id uuid references public.plano_contas (id) on delete set null,
  categoria_comissoes_id uuid references public.categorias_financeiras (id) on delete set null,
  plano_comissoes_id uuid references public.plano_contas (id) on delete set null,
  categoria_mao_obra_direta_id uuid references public.categorias_financeiras (id) on delete set null,
  plano_mao_obra_direta_id uuid references public.plano_contas (id) on delete set null,
  gerar_automatico_padrao boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.tenant_mecanico_config enable row level security;

drop policy if exists "Gestores gerenciam config mecanico" on public.tenant_mecanico_config;
create policy "Gestores gerenciam config mecanico"
  on public.tenant_mecanico_config for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_mecanico_config.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_mecanico_config.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'manager')
    )
  );

/* ─── Alocação OS × mecânicos ─────────────────────────────── */

create table if not exists public.ordem_servico_mecanicos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ordem_servico_id uuid not null references public.ordens_servico (id) on delete cascade,
  mecanico_id uuid not null references public.mecanicos (id) on delete restrict,
  papel text not null default 'auxiliar'
    check (papel in ('principal', 'auxiliar', 'responsavel_tecnico')),
  etapa text,
  percentual_participacao numeric(6,2) not null default 0
    check (percentual_participacao >= 0 and percentual_participacao <= 100),
  horas_estimadas numeric(10,2) not null default 0 check (horas_estimadas >= 0),
  horas_realizadas numeric(10,2) not null default 0 check (horas_realizadas >= 0),
  rateio_receita_mao_obra numeric(6,2) not null default 0
    check (rateio_receita_mao_obra >= 0 and rateio_receita_mao_obra <= 100),
  rateio_comissao numeric(6,2) not null default 0
    check (rateio_comissao >= 0 and rateio_comissao <= 100),
  atribuido_em timestamptz not null default now(),
  removido_em timestamptz,
  motivo_remocao text,
  observacao text,
  ativo boolean not null default true,
  congelado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create unique index if not exists uq_os_mecanico_papel_ativo
  on public.ordem_servico_mecanicos (tenant_id, ordem_servico_id, mecanico_id, papel)
  where ativo = true and removido_em is null;

create unique index if not exists uq_os_mecanico_principal_ativo
  on public.ordem_servico_mecanicos (tenant_id, ordem_servico_id)
  where ativo = true and removido_em is null and papel = 'principal';

create index if not exists idx_os_mecanicos_os
  on public.ordem_servico_mecanicos (tenant_id, ordem_servico_id)
  where ativo = true;

create index if not exists idx_os_mecanicos_mecanico
  on public.ordem_servico_mecanicos (tenant_id, mecanico_id)
  where ativo = true;

alter table public.ordem_servico_mecanicos enable row level security;

drop policy if exists "Membros leem os mecanicos" on public.ordem_servico_mecanicos;
create policy "Membros leem os mecanicos"
  on public.ordem_servico_mecanicos for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_mecanicos.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros gerenciam os mecanicos" on public.ordem_servico_mecanicos;
create policy "Membros gerenciam os mecanicos"
  on public.ordem_servico_mecanicos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_mecanicos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_mecanicos.tenant_id and tm.user_id = auth.uid()
    )
  );

/* ─── Apontamento de horas ────────────────────────────────── */

create table if not exists public.mecanico_apontamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  mecanico_id uuid not null references public.mecanicos (id) on delete restrict,
  ordem_servico_id uuid references public.ordens_servico (id) on delete set null,
  ordem_servico_item_id uuid,
  servico_descricao text,
  status text not null default 'em_andamento'
    check (status in ('em_andamento', 'pausado', 'finalizado', 'cancelado')),
  inicio_em timestamptz not null default now(),
  fim_em timestamptz,
  pausa_total_segundos integer not null default 0 check (pausa_total_segundos >= 0),
  pausa_inicio_em timestamptz,
  duracao_segundos integer not null default 0 check (duracao_segundos >= 0),
  manual boolean not null default false,
  motivo text,
  custo_hora_aplicado numeric(14,4),
  custo_mao_obra numeric(14,2),
  usuario_id uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mecanico_apontamentos_os
  on public.mecanico_apontamentos (tenant_id, ordem_servico_id, inicio_em desc)
  where deleted_at is null;

create index if not exists idx_mecanico_apontamentos_mec
  on public.mecanico_apontamentos (tenant_id, mecanico_id, inicio_em desc)
  where deleted_at is null;

create unique index if not exists uq_mecanico_apontamento_aberto
  on public.mecanico_apontamentos (tenant_id, mecanico_id)
  where deleted_at is null and status in ('em_andamento', 'pausado');

alter table public.mecanico_apontamentos enable row level security;

drop policy if exists "Membros leem apontamentos" on public.mecanico_apontamentos;
create policy "Membros leem apontamentos"
  on public.mecanico_apontamentos for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = mecanico_apontamentos.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros gerenciam apontamentos" on public.mecanico_apontamentos;
create policy "Membros gerenciam apontamentos"
  on public.mecanico_apontamentos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = mecanico_apontamentos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = mecanico_apontamentos.tenant_id and tm.user_id = auth.uid()
    )
  );

/* ─── Auditoria ───────────────────────────────────────────── */

create table if not exists public.mecanico_auditoria (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  entidade_tipo text not null,
  entidade_id uuid not null,
  acao text not null,
  valor_anterior jsonb,
  valor_novo jsonb,
  motivo text,
  usuario_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_mecanico_auditoria_entidade
  on public.mecanico_auditoria (tenant_id, entidade_tipo, entidade_id, created_at desc);

alter table public.mecanico_auditoria enable row level security;

drop policy if exists "Gestores leem auditoria mecanico" on public.mecanico_auditoria;
create policy "Gestores leem auditoria mecanico"
  on public.mecanico_auditoria for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = mecanico_auditoria.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'manager')
    )
  );

drop policy if exists "Membros inserem auditoria mecanico" on public.mecanico_auditoria;
create policy "Membros inserem auditoria mecanico"
  on public.mecanico_auditoria for insert
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = mecanico_auditoria.tenant_id and tm.user_id = auth.uid()
    )
  );

/* ─── Helpers ─────────────────────────────────────────────── */

create or replace function public.fn_calcular_custo_mecanico(
  p_salario_base numeric,
  p_pro_labore numeric,
  p_adicional numeric,
  p_comissao numeric,
  p_horas_extras numeric,
  p_beneficios numeric,
  p_cesta_basica numeric,
  p_vale_transporte numeric,
  p_vale_refeicao numeric,
  p_encargos numeric,
  p_impostos numeric,
  p_bonus numeric,
  p_descontos numeric,
  p_horas_base numeric
)
returns table (custo_mensal numeric, custo_hora numeric)
language sql
immutable
as $$
  select
    greatest(
      coalesce(p_salario_base,0) + coalesce(p_pro_labore,0) + coalesce(p_adicional,0)
      + coalesce(p_comissao,0) + coalesce(p_horas_extras,0) + coalesce(p_beneficios,0)
      + coalesce(p_cesta_basica,0) + coalesce(p_vale_transporte,0) + coalesce(p_vale_refeicao,0)
      + coalesce(p_encargos,0) + coalesce(p_impostos,0) + coalesce(p_bonus,0)
      - coalesce(p_descontos,0),
      0
    )::numeric(14,2) as custo_mensal,
    case
      when coalesce(p_horas_base, 0) > 0 then
        (
          greatest(
            coalesce(p_salario_base,0) + coalesce(p_pro_labore,0) + coalesce(p_adicional,0)
            + coalesce(p_comissao,0) + coalesce(p_horas_extras,0) + coalesce(p_beneficios,0)
            + coalesce(p_cesta_basica,0) + coalesce(p_vale_transporte,0) + coalesce(p_vale_refeicao,0)
            + coalesce(p_encargos,0) + coalesce(p_impostos,0) + coalesce(p_bonus,0)
            - coalesce(p_descontos,0),
            0
          ) / p_horas_base
        )::numeric(14,4)
      else 0::numeric(14,4)
    end as custo_hora;
$$;

create or replace function public.trg_mecanico_custos_calc()
returns trigger
language plpgsql
as $$
declare
  v_calc record;
begin
  select * into v_calc
  from public.fn_calcular_custo_mecanico(
    new.salario_base, new.pro_labore, new.adicional, new.comissao, new.horas_extras,
    new.beneficios, new.cesta_basica, new.vale_transporte, new.vale_refeicao,
    new.encargos, new.impostos, new.bonus, new.descontos, new.horas_base_calculo
  );
  new.custo_mensal_total := v_calc.custo_mensal;
  new.custo_hora := v_calc.custo_hora;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_mecanico_custos_calc on public.mecanico_custos;
create trigger trg_mecanico_custos_calc
  before insert or update on public.mecanico_custos
  for each row execute function public.trg_mecanico_custos_calc();

create or replace function public.fn_mecanico_audit(
  p_tenant_id uuid,
  p_entidade_tipo text,
  p_entidade_id uuid,
  p_acao text,
  p_anterior jsonb default null,
  p_novo jsonb default null,
  p_motivo text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.mecanico_auditoria (
    tenant_id, entidade_tipo, entidade_id, acao,
    valor_anterior, valor_novo, motivo, usuario_id
  ) values (
    p_tenant_id, p_entidade_tipo, p_entidade_id, p_acao,
    p_anterior, p_novo, p_motivo, auth.uid()
  );
end;
$$;

/* ─── RPC: gerar obrigação → CAP ──────────────────────────── */

create or replace function public.gerar_obrigacao_mecanico_atomico(
  p_tenant_id uuid,
  p_mecanico_id uuid,
  p_competencia date,
  p_tipo_obrigacao text default 'folha',
  p_data_vencimento date default null,
  p_observacoes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_mec public.mecanicos%rowtype;
  v_custo public.mecanico_custos%rowtype;
  v_comp_id uuid;
  v_cp_id uuid;
  v_competencia date;
  v_vencimento date;
  v_dia integer;
  v_cat uuid;
  v_plano uuid;
  v_cc uuid;
  v_cfg public.tenant_mecanico_config%rowtype;
  v_existe uuid;
  v_last_day integer;
begin
  perform public.assert_tenant_member(p_tenant_id);

  if p_tipo_obrigacao is null or p_tipo_obrigacao not in ('folha','comissao','bonus','adiantamento','outro') then
    raise exception 'Tipo de obrigação inválido.';
  end if;

  v_competencia := date_trunc('month', p_competencia)::date;

  select * into v_mec
  from public.mecanicos
  where id = p_mecanico_id and tenant_id = p_tenant_id and deleted_at is null
  for update;

  if not found then
    raise exception 'Mecânico não encontrado.';
  end if;

  if v_mec.status <> 'ativo' then
    raise exception 'Mecânico inativo/arquivado não gera obrigação.';
  end if;

  select id into v_existe
  from public.mecanico_competencias
  where tenant_id = p_tenant_id
    and mecanico_id = p_mecanico_id
    and competencia = v_competencia
    and tipo_obrigacao = p_tipo_obrigacao
    and deleted_at is null;

  if v_existe is not null then
    raise exception 'Já existe obrigação para tenant+mecânico+competência+tipo.';
  end if;

  select * into v_custo
  from public.mecanico_custos
  where tenant_id = p_tenant_id
    and mecanico_id = p_mecanico_id
    and deleted_at is null
    and vigencia_inicio <= v_competencia
    and (vigencia_fim is null or vigencia_fim >= v_competencia)
  order by vigencia_inicio desc
  limit 1;

  if not found then
    raise exception 'Sem custo vigente para a competência.';
  end if;

  if v_custo.geracao_pausada then
    raise exception 'Geração de obrigação pausada para este custo.';
  end if;

  select * into v_cfg from public.tenant_mecanico_config where tenant_id = p_tenant_id;

  v_cat := coalesce(v_custo.categoria_financeira_id, v_cfg.categoria_folha_id);
  v_plano := coalesce(v_custo.plano_conta_id, v_cfg.plano_folha_id);
  v_cc := coalesce(v_custo.centro_custo_id, v_mec.centro_custo_id);

  if v_cat is null or v_plano is null or v_cc is null then
    raise exception 'Classificação financeira incompleta (categoria/plano/centro de custo).';
  end if;

  v_dia := coalesce(v_custo.data_vencimento_padrao, v_custo.dia_pagamento, 5);
  v_last_day := extract(day from (date_trunc('month', v_competencia) + interval '1 month - 1 day'))::integer;
  v_vencimento := coalesce(
    p_data_vencimento,
    make_date(
      extract(year from v_competencia)::integer,
      extract(month from v_competencia)::integer,
      least(v_dia, v_last_day)
    )
  );

  insert into public.mecanico_competencias (
    tenant_id, mecanico_id, mecanico_custo_id, competencia, tipo_obrigacao,
    valor, status, data_vencimento,
    categoria_financeira_id, plano_conta_id, centro_custo_id, unidade_id,
    conta_bancaria_id, forma_pagamento_id, observacoes, origem, created_by
  ) values (
    p_tenant_id, p_mecanico_id, v_custo.id, v_competencia, p_tipo_obrigacao,
    v_custo.custo_mensal_total, 'pendente', v_vencimento,
    v_cat, v_plano, v_cc, v_mec.unidade_id,
    v_custo.conta_bancaria_id, v_custo.forma_pagamento_id,
    p_observacoes, 'mecanico', auth.uid()
  )
  returning id into v_comp_id;

  insert into public.contas_pagar (
    tenant_id, fornecedor_nome,
    categoria_financeira_id, centro_custo_id, plano_conta_id,
    forma_pagamento_id, conta_bancaria_id,
    descricao, valor_original, status,
    data_emissao, data_competencia, data_vencimento,
    parcela_numero, parcela_total,
    observacoes, mecanico_competencia_id
  ) values (
    p_tenant_id, v_mec.nome_completo,
    v_cat, v_cc, v_plano,
    v_custo.forma_pagamento_id, v_custo.conta_bancaria_id,
    format('Folha/mecânico %s — %s', v_mec.nome_completo, to_char(v_competencia, 'YYYY-MM')),
    v_custo.custo_mensal_total, 'aberto',
    v_competencia, v_competencia, v_vencimento,
    1, 1,
    coalesce(p_observacoes, format('Origem: mecânico/%s', p_tipo_obrigacao)),
    v_comp_id
  )
  returning id into v_cp_id;

  update public.mecanico_competencias
  set conta_pagar_id = v_cp_id, status = 'gerada', updated_at = now()
  where id = v_comp_id;

  perform public.fn_mecanico_audit(
    p_tenant_id, 'mecanico_competencia', v_comp_id, 'gerar_obrigacao',
    null,
    jsonb_build_object(
      'competencia', v_competencia,
      'valor', v_custo.custo_mensal_total,
      'conta_pagar_id', v_cp_id,
      'tipo', p_tipo_obrigacao
    ),
    p_observacoes
  );

  return v_comp_id;
end;
$$;

grant execute on function public.gerar_obrigacao_mecanico_atomico(uuid, uuid, date, text, date, text) to authenticated;

/* ─── RPC: atribuir mecânico na OS ────────────────────────── */

create or replace function public.os_atribuir_mecanico_atomico(
  p_tenant_id uuid,
  p_ordem_id uuid,
  p_mecanico_id uuid,
  p_papel text default 'principal',
  p_percentual numeric default 100,
  p_horas_estimadas numeric default 0,
  p_etapa text default null,
  p_observacao text default null,
  p_forcar boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_os public.ordens_servico%rowtype;
  v_mec public.mecanicos%rowtype;
  v_id uuid;
  v_soma numeric;
  v_status_terminal text[] := array['concluida','cancelada','faturada','entregue'];
begin
  perform public.assert_tenant_member(p_tenant_id);

  if p_papel not in ('principal', 'auxiliar', 'responsavel_tecnico') then
    raise exception 'Papel inválido.';
  end if;

  if p_percentual < 0 or p_percentual > 100 then
    raise exception 'Participação inválida.';
  end if;

  select * into v_os
  from public.ordens_servico
  where id = p_ordem_id and tenant_id = p_tenant_id and deleted_at is null
  for update;

  if not found then
    raise exception 'OS não encontrada.';
  end if;

  if v_os.status = any (v_status_terminal) and not p_forcar then
    raise exception 'OS concluída: alocação congelada (requer permissão superior).';
  end if;

  select * into v_mec
  from public.mecanicos
  where id = p_mecanico_id and tenant_id = p_tenant_id and deleted_at is null;

  if not found then
    raise exception 'Mecânico não encontrado.';
  end if;

  if v_mec.status <> 'ativo' then
    raise exception 'Mecânico inativo não pode ser atribuído.';
  end if;

  if v_mec.disponibilidade in ('afastado', 'ferias') and not p_forcar then
    raise exception 'Mecânico indisponível (%).', v_mec.disponibilidade;
  end if;

  if p_papel = 'principal' then
    update public.ordem_servico_mecanicos
    set ativo = false, removido_em = now(), motivo_remocao = 'substituido_principal',
        updated_at = now()
    where tenant_id = p_tenant_id
      and ordem_servico_id = p_ordem_id
      and papel = 'principal'
      and ativo = true
      and removido_em is null;
  end if;

  select coalesce(sum(percentual_participacao), 0) into v_soma
  from public.ordem_servico_mecanicos
  where tenant_id = p_tenant_id
    and ordem_servico_id = p_ordem_id
    and ativo = true
    and removido_em is null
    and mecanico_id <> p_mecanico_id;

  if v_soma + p_percentual > 100 then
    raise exception 'Soma da participação não pode ultrapassar 100%%.';
  end if;

  select id into v_id
  from public.ordem_servico_mecanicos
  where tenant_id = p_tenant_id
    and ordem_servico_id = p_ordem_id
    and mecanico_id = p_mecanico_id
    and papel = p_papel
    and removido_em is null
  limit 1;

  if v_id is not null then
    update public.ordem_servico_mecanicos
    set percentual_participacao = p_percentual,
        horas_estimadas = coalesce(p_horas_estimadas, horas_estimadas),
        etapa = coalesce(p_etapa, etapa),
        observacao = coalesce(p_observacao, observacao),
        ativo = true,
        removido_em = null,
        motivo_remocao = null,
        updated_at = now()
    where id = v_id;
  else
    insert into public.ordem_servico_mecanicos (
      tenant_id, ordem_servico_id, mecanico_id, papel,
      percentual_participacao, horas_estimadas, etapa, observacao, created_by
    ) values (
      p_tenant_id, p_ordem_id, p_mecanico_id, p_papel,
      p_percentual, coalesce(p_horas_estimadas, 0), p_etapa, p_observacao, auth.uid()
    )
    returning id into v_id;
  end if;

  -- Compat: sincroniza mecanico_id (profiles) quando houver vínculo
  if p_papel = 'principal' and v_mec.profile_id is not null then
    update public.ordens_servico
    set mecanico_id = v_mec.profile_id, updated_at = now()
    where id = p_ordem_id and tenant_id = p_tenant_id;
  end if;

  insert into public.ordem_servico_eventos (
    tenant_id, ordem_servico_id, tipo, descricao,
    entidade_tipo, entidade_id, user_id, motivo
  ) values (
    p_tenant_id, p_ordem_id, 'atribuicao_mecanico',
    format('Mecânico %s atribuído como %s (%.0f%%)', v_mec.nome_completo, p_papel, p_percentual),
    'mecanico', p_mecanico_id, auth.uid(), p_observacao
  );

  perform public.fn_mecanico_audit(
    p_tenant_id, 'ordem_servico_mecanico', coalesce(v_id, p_ordem_id), 'atribuir',
    null,
    jsonb_build_object('os', p_ordem_id, 'mecanico', p_mecanico_id, 'papel', p_papel),
    p_observacao
  );

  return v_id;
end;
$$;

grant execute on function public.os_atribuir_mecanico_atomico(uuid, uuid, uuid, text, numeric, numeric, text, text, boolean) to authenticated;

/* ─── RPC: apontamento de horas ───────────────────────────── */

create or replace function public.mecanico_apontamento_atomico(
  p_tenant_id uuid,
  p_mecanico_id uuid,
  p_acao text, -- iniciar | pausar | retomar | finalizar | manual
  p_ordem_id uuid default null,
  p_inicio timestamptz default null,
  p_fim timestamptz default null,
  p_motivo text default null,
  p_servico text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_apt public.mecanico_apontamentos%rowtype;
  v_id uuid;
  v_custo numeric(14,4);
  v_dur integer;
  v_now timestamptz := now();
begin
  perform public.assert_tenant_member(p_tenant_id);

  if p_acao not in ('iniciar','pausar','retomar','finalizar','manual') then
    raise exception 'Ação inválida.';
  end if;

  if p_acao = 'iniciar' then
    if exists (
      select 1 from public.mecanico_apontamentos
      where tenant_id = p_tenant_id and mecanico_id = p_mecanico_id
        and deleted_at is null and status in ('em_andamento','pausado')
    ) then
      raise exception 'Já existe apontamento aberto para este mecânico.';
    end if;

    insert into public.mecanico_apontamentos (
      tenant_id, mecanico_id, ordem_servico_id, servico_descricao,
      status, inicio_em, usuario_id
    ) values (
      p_tenant_id, p_mecanico_id, p_ordem_id, p_servico,
      'em_andamento', coalesce(p_inicio, v_now), auth.uid()
    ) returning id into v_id;

    update public.mecanicos
    set disponibilidade = 'ocupado', updated_at = now()
    where id = p_mecanico_id and tenant_id = p_tenant_id;

    return v_id;
  end if;

  if p_acao = 'manual' then
    if p_inicio is null or p_fim is null then
      raise exception 'Apontamento manual exige início e fim.';
    end if;
    if p_fim <= p_inicio then
      raise exception 'Fim deve ser posterior ao início.';
    end if;

    v_dur := greatest(extract(epoch from (p_fim - p_inicio))::integer, 0);

    select mc.custo_hora into v_custo
    from public.mecanico_custos mc
    where mc.tenant_id = p_tenant_id
      and mc.mecanico_id = p_mecanico_id
      and mc.deleted_at is null
      and mc.vigencia_inicio <= (p_inicio::date)
      and (mc.vigencia_fim is null or mc.vigencia_fim >= p_inicio::date)
    order by mc.vigencia_inicio desc
    limit 1;

    insert into public.mecanico_apontamentos (
      tenant_id, mecanico_id, ordem_servico_id, servico_descricao,
      status, inicio_em, fim_em, duracao_segundos, manual, motivo,
      custo_hora_aplicado, custo_mao_obra, usuario_id
    ) values (
      p_tenant_id, p_mecanico_id, p_ordem_id, p_servico,
      'finalizado', p_inicio, p_fim, v_dur, true, p_motivo,
      coalesce(v_custo, 0),
      round((coalesce(v_custo, 0) * (v_dur / 3600.0))::numeric, 2),
      auth.uid()
    ) returning id into v_id;

    if p_ordem_id is not null then
      update public.ordem_servico_mecanicos
      set horas_realizadas = horas_realizadas + (v_dur / 3600.0),
          updated_at = now()
      where tenant_id = p_tenant_id
        and ordem_servico_id = p_ordem_id
        and mecanico_id = p_mecanico_id
        and ativo = true
        and removido_em is null;
    end if;

    perform public.fn_mecanico_audit(
      p_tenant_id, 'mecanico_apontamento', v_id, 'apontamento_manual',
      null, jsonb_build_object('duracao_segundos', v_dur), p_motivo
    );

    return v_id;
  end if;

  select * into v_apt
  from public.mecanico_apontamentos
  where tenant_id = p_tenant_id and mecanico_id = p_mecanico_id
    and deleted_at is null and status in ('em_andamento','pausado')
  for update;

  if not found then
    raise exception 'Nenhum apontamento aberto.';
  end if;

  if p_acao = 'pausar' then
    if v_apt.status <> 'em_andamento' then
      raise exception 'Apontamento não está em andamento.';
    end if;
    update public.mecanico_apontamentos
    set status = 'pausado', pausa_inicio_em = v_now, updated_at = v_now, motivo = coalesce(p_motivo, motivo)
    where id = v_apt.id;
    update public.mecanicos set disponibilidade = 'pausa', updated_at = v_now
    where id = p_mecanico_id and tenant_id = p_tenant_id;
    return v_apt.id;
  end if;

  if p_acao = 'retomar' then
    if v_apt.status <> 'pausado' then
      raise exception 'Apontamento não está pausado.';
    end if;
    update public.mecanico_apontamentos
    set status = 'em_andamento',
        pausa_total_segundos = pausa_total_segundos
          + greatest(extract(epoch from (v_now - coalesce(pausa_inicio_em, v_now)))::integer, 0),
        pausa_inicio_em = null,
        updated_at = v_now
    where id = v_apt.id;
    update public.mecanicos set disponibilidade = 'ocupado', updated_at = v_now
    where id = p_mecanico_id and tenant_id = p_tenant_id;
    return v_apt.id;
  end if;

  -- finalizar
  if v_apt.status = 'pausado' and v_apt.pausa_inicio_em is not null then
    v_apt.pausa_total_segundos := v_apt.pausa_total_segundos
      + greatest(extract(epoch from (v_now - v_apt.pausa_inicio_em))::integer, 0);
  end if;

  v_dur := greatest(
    extract(epoch from (coalesce(p_fim, v_now) - v_apt.inicio_em))::integer
      - coalesce(v_apt.pausa_total_segundos, 0),
    0
  );

  select mc.custo_hora into v_custo
  from public.mecanico_custos mc
  where mc.tenant_id = p_tenant_id
    and mc.mecanico_id = p_mecanico_id
    and mc.deleted_at is null
    and mc.vigencia_inicio <= (v_apt.inicio_em::date)
    and (mc.vigencia_fim is null or mc.vigencia_fim >= v_apt.inicio_em::date)
  order by mc.vigencia_inicio desc
  limit 1;

  update public.mecanico_apontamentos
  set status = 'finalizado',
      fim_em = coalesce(p_fim, v_now),
      pausa_total_segundos = v_apt.pausa_total_segundos,
      pausa_inicio_em = null,
      duracao_segundos = v_dur,
      custo_hora_aplicado = coalesce(v_custo, 0),
      custo_mao_obra = round((coalesce(v_custo, 0) * (v_dur / 3600.0))::numeric, 2),
      motivo = coalesce(p_motivo, motivo),
      updated_at = v_now
  where id = v_apt.id;

  if v_apt.ordem_servico_id is not null then
    update public.ordem_servico_mecanicos
    set horas_realizadas = horas_realizadas + (v_dur / 3600.0),
        updated_at = v_now
    where tenant_id = p_tenant_id
      and ordem_servico_id = v_apt.ordem_servico_id
      and mecanico_id = p_mecanico_id
      and ativo = true
      and removido_em is null;

    insert into public.ordem_servico_eventos (
      tenant_id, ordem_servico_id, tipo, descricao,
      entidade_tipo, entidade_id, user_id, motivo
    ) values (
      p_tenant_id, v_apt.ordem_servico_id, 'apontamento_horas',
      format('Apontamento finalizado: %s h', round((v_dur / 3600.0)::numeric, 2)),
      'mecanico_apontamento', v_apt.id, auth.uid(), p_motivo
    );
  end if;

  update public.mecanicos
  set disponibilidade = 'disponivel', updated_at = v_now
  where id = p_mecanico_id and tenant_id = p_tenant_id;

  return v_apt.id;
end;
$$;

grant execute on function public.mecanico_apontamento_atomico(uuid, uuid, text, uuid, timestamptz, timestamptz, text, text) to authenticated;

/* ─── Permissões ──────────────────────────────────────────── */

do $$
declare
  r record;
  keys text[] := array[
    'mecanicos.visualizar',
    'mecanicos.criar',
    'mecanicos.editar',
    'mecanicos.ver_custo',
    'mecanicos.editar_custo',
    'mecanicos.gerar_folha',
    'mecanicos.apontar_horas',
    'mecanicos.apontar_horas_manual',
    'mecanicos.visualizar_dashboard',
    'os.atribuir_mecanico',
    'os.transferir_mecanico',
    'financeiro.gerar_obrigacao_mecanico'
  ];
  k text;
begin
  for r in select id from public.tenants loop
    foreach k in array keys loop
      insert into public.tenant_role_permissions (tenant_id, role, permission_key, allowed)
      values (r.id, 'owner', k, true)
      on conflict (tenant_id, role, permission_key) do nothing;

      insert into public.tenant_role_permissions (tenant_id, role, permission_key, allowed)
      values (r.id, 'admin', k, true)
      on conflict (tenant_id, role, permission_key) do nothing;

      insert into public.tenant_role_permissions (tenant_id, role, permission_key, allowed)
      values (
        r.id, 'manager', k,
        k not in ('mecanicos.editar_custo', 'financeiro.gerar_obrigacao_mecanico')
          or true
      )
      on conflict (tenant_id, role, permission_key) do nothing;

      -- member: visualizar + apontar + atribuir
      insert into public.tenant_role_permissions (tenant_id, role, permission_key, allowed)
      values (
        r.id, 'member', k,
        k in (
          'mecanicos.visualizar',
          'mecanicos.apontar_horas',
          'mecanicos.visualizar_dashboard',
          'os.atribuir_mecanico'
        )
      )
      on conflict (tenant_id, role, permission_key) do nothing;
    end loop;
  end loop;
exception when others then
  raise notice 'seed perms mecanicos: %', sqlerrm;
end;
$$;

notify pgrst, 'reload schema';
