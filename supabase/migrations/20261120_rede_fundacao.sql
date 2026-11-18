-- Painel Operacional de Rede (multi-loja) — Rodada 14: fundação.
--
-- Uma empresa (tenant) pode ter várias lojas. Cada loja tem vendas, metas e
-- indicadores próprios. O acesso é por papel + lojas autorizadas e é aplicado
-- AQUI no banco (RLS), não só na interface.
--
-- Aditiva: não altera nem remove nada existente, exceto UMA coluna nova em
-- public.tenants (rede_operacional, default false) que liga o módulo.

-- ---------------------------------------------------------------------------
-- 0. Liga o módulo por empresa
-- ---------------------------------------------------------------------------
alter table public.tenants
  add column if not exists rede_operacional boolean not null default false;

comment on column public.tenants.rede_operacional is
  'Liga o módulo Rede de lojas (painel operacional multi-loja). Default false: nenhuma empresa existente muda.';

-- ---------------------------------------------------------------------------
-- 1. Lojas
-- ---------------------------------------------------------------------------
create table if not exists public.rede_lojas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null,
  nome text not null,
  status text not null default 'operando',
  canais text not null default 'salao+delivery',
  data_inauguracao date,
  inauguracao_prevista text,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_lojas_slug_chk check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  constraint rede_lojas_nome_chk check (char_length(btrim(nome)) between 1 and 120),
  constraint rede_lojas_status_chk check (status in ('operando', 'inauguracao', 'inativa')),
  constraint rede_lojas_canais_chk check (canais in ('salao+delivery', 'delivery', 'salao')),
  constraint rede_lojas_tenant_slug_uk unique (tenant_id, slug),
  -- necessário para as chaves compostas (tenant_id, loja_id) das tabelas filhas:
  -- garante que um lançamento nunca aponte para loja de outra empresa.
  constraint rede_lojas_tenant_id_uk unique (tenant_id, id)
);
comment on table public.rede_lojas is
  'Lojas/unidades de uma empresa com módulo Rede de lojas. Inativar em vez de excluir.';

-- ---------------------------------------------------------------------------
-- 2. Papéis x módulos (tabela de referência) e acessos por usuário
-- ---------------------------------------------------------------------------
create table if not exists public.rede_papel_modulo (
  papel text not null,
  modulo text not null,
  pode_ver boolean not null default false,
  pode_editar boolean not null default false,
  primary key (papel, modulo),
  constraint rede_papel_modulo_papel_chk check (papel in ('consultor', 'diretoria', 'gerente_regional', 'gerente_loja')),
  constraint rede_papel_modulo_modulo_chk check (modulo in (
    'dashboard', 'vendas', 'metas', 'cmv', 'rupturas', 'estoque_cc', 'delivery', 'qualidade',
    'planos_acao', 'dre', 'orcamento', 'rh_quadro', 'rh_movimentos', 'rh_ocorrencias',
    'avaliacao_gerentes', 'nine_box', 'sucessao', 'relatorios', 'config'
  )),
  constraint rede_papel_modulo_editar_chk check (pode_ver or not pode_editar)
);
comment on table public.rede_papel_modulo is
  'O que cada papel pode ver/editar em cada módulo. Administrador (owner/admin da empresa) tem tudo; colaborador usa a lista de módulos do próprio acesso.';

insert into public.rede_papel_modulo (papel, modulo, pode_ver, pode_editar) values
  -- consultor: acompanha e lança em tudo, exceto configuração/acessos
  ('consultor', 'dashboard', true, false),
  ('consultor', 'vendas', true, true),
  ('consultor', 'metas', true, true),
  ('consultor', 'cmv', true, true),
  ('consultor', 'rupturas', true, true),
  ('consultor', 'estoque_cc', true, true),
  ('consultor', 'delivery', true, true),
  ('consultor', 'qualidade', true, true),
  ('consultor', 'planos_acao', true, true),
  ('consultor', 'dre', true, true),
  ('consultor', 'orcamento', true, true),
  ('consultor', 'rh_quadro', true, true),
  ('consultor', 'rh_movimentos', true, true),
  ('consultor', 'rh_ocorrencias', true, true),
  ('consultor', 'avaliacao_gerentes', true, true),
  ('consultor', 'nine_box', true, true),
  ('consultor', 'sucessao', true, true),
  ('consultor', 'relatorios', true, false),
  -- diretoria: leitura consolidada (sem ocorrências individuais de RH)
  ('diretoria', 'dashboard', true, false),
  ('diretoria', 'vendas', true, false),
  ('diretoria', 'metas', true, false),
  ('diretoria', 'cmv', true, false),
  ('diretoria', 'rupturas', true, false),
  ('diretoria', 'estoque_cc', true, false),
  ('diretoria', 'delivery', true, false),
  ('diretoria', 'qualidade', true, false),
  ('diretoria', 'planos_acao', true, false),
  ('diretoria', 'dre', true, false),
  ('diretoria', 'orcamento', true, false),
  ('diretoria', 'rh_quadro', true, false),
  ('diretoria', 'rh_movimentos', true, false),
  ('diretoria', 'avaliacao_gerentes', true, false),
  ('diretoria', 'nine_box', true, false),
  ('diretoria', 'sucessao', true, false),
  ('diretoria', 'relatorios', true, false),
  -- gerente regional: lojas sob sua responsabilidade; sem DRE/orçamento
  ('gerente_regional', 'dashboard', true, false),
  ('gerente_regional', 'vendas', true, true),
  ('gerente_regional', 'metas', true, false),
  ('gerente_regional', 'cmv', true, true),
  ('gerente_regional', 'rupturas', true, true),
  ('gerente_regional', 'estoque_cc', true, true),
  ('gerente_regional', 'delivery', true, true),
  ('gerente_regional', 'qualidade', true, true),
  ('gerente_regional', 'planos_acao', true, true),
  ('gerente_regional', 'rh_quadro', true, false),
  ('gerente_regional', 'rh_movimentos', true, true),
  ('gerente_regional', 'rh_ocorrencias', true, true),
  ('gerente_regional', 'avaliacao_gerentes', true, false),
  ('gerente_regional', 'nine_box', true, false),
  ('gerente_regional', 'sucessao', true, false),
  ('gerente_regional', 'relatorios', true, false),
  -- gerente de loja: só a própria loja, lançamentos operacionais
  ('gerente_loja', 'dashboard', true, false),
  ('gerente_loja', 'vendas', true, true),
  ('gerente_loja', 'metas', true, false),
  ('gerente_loja', 'cmv', true, true),
  ('gerente_loja', 'rupturas', true, true),
  ('gerente_loja', 'delivery', true, true),
  ('gerente_loja', 'qualidade', true, true),
  ('gerente_loja', 'planos_acao', true, true),
  ('gerente_loja', 'rh_quadro', true, false),
  ('gerente_loja', 'relatorios', true, false)
on conflict (papel, modulo) do nothing;

create table if not exists public.rede_acessos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null,
  papel text not null,
  todas_lojas boolean not null default false,
  loja_ids uuid[] not null default '{}',
  modulos text[] not null default '{}',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_acessos_papel_chk check (papel in ('consultor', 'diretoria', 'gerente_regional', 'gerente_loja', 'colaborador')),
  constraint rede_acessos_status_chk check (status in ('active', 'inactive')),
  constraint rede_acessos_escopo_chk check (todas_lojas or cardinality(loja_ids) > 0),
  constraint rede_acessos_tenant_user_uk unique (tenant_id, user_id)
);
comment on table public.rede_acessos is
  'Acesso de um usuário ao módulo Rede: papel, lojas autorizadas e (colaborador) módulos permitidos. Owner/admin da empresa não precisam de linha aqui.';

-- Valida o acesso na gravação: usuário precisa ser membro ativo da empresa,
-- lojas precisam ser da mesma empresa, módulos precisam existir.
create or replace function public.rede_acessos_validar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok_modulos text[] := array['dashboard','vendas','metas','cmv','rupturas','estoque_cc','delivery','qualidade','planos_acao'];
  v_qtd integer;
begin
  if not exists (
    select 1 from public.tenant_members tm
    where tm.tenant_id = new.tenant_id and tm.user_id = new.user_id
      and tm.status = 'active' and tm.deactivated_at is null
  ) then
    raise exception 'rede_acesso_usuario_nao_e_membro' using errcode = '23514';
  end if;

  if cardinality(new.loja_ids) > 0 then
    select count(*) into v_qtd from public.rede_lojas l
      where l.tenant_id = new.tenant_id and l.id = any (new.loja_ids);
    if v_qtd <> cardinality(new.loja_ids) then
      raise exception 'rede_acesso_loja_de_outra_empresa' using errcode = '23514';
    end if;
  end if;

  if new.papel = 'colaborador' then
    if cardinality(new.modulos) = 0 then
      raise exception 'rede_acesso_colaborador_sem_modulos' using errcode = '23514';
    end if;
    if exists (select 1 from unnest(new.modulos) m where m <> all (v_ok_modulos)) then
      raise exception 'rede_acesso_modulo_nao_permitido_a_colaborador' using errcode = '23514';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists rede_acessos_validar_trg on public.rede_acessos;
create trigger rede_acessos_validar_trg
  before insert or update on public.rede_acessos
  for each row execute function public.rede_acessos_validar();

-- ---------------------------------------------------------------------------
-- 3. Configuração, metas e indicadores
-- ---------------------------------------------------------------------------
create table if not exists public.rede_config (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  ambiente text not null default 'real',
  piso_loja numeric(14,2) not null default 500000,
  pesos_dia_semana jsonb not null default '{"seg":0.85,"ter":0.9,"qua":0.95,"qui":1,"sex":1.25,"sab":1.35,"dom":1.15}'::jsonb,
  tolerancia_cmv numeric(5,2) not null default 1,
  tolerancia_semaforo_pct numeric(5,2) not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_config_ambiente_chk check (ambiente in ('real', 'demonstracao')),
  constraint rede_config_piso_chk check (piso_loja >= 0),
  constraint rede_config_tol_cmv_chk check (tolerancia_cmv >= 0),
  constraint rede_config_tol_sem_chk check (tolerancia_semaforo_pct between 0 and 100),
  constraint rede_config_pesos_chk check (pesos_dia_semana ?& array['seg','ter','qua','qui','sex','sab','dom'])
);

-- Metas por indicador, com histórico (cada alteração fecha a vigente e abre outra).
-- loja_id nulo = meta padrão da rede.
create table if not exists public.rede_metas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid,
  indicador text not null,
  meta numeric(14,4),
  direcao text,
  valido_de date not null,
  valido_ate date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint rede_metas_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  constraint rede_metas_tenant_fk foreign key (tenant_id) references public.tenants (id) on delete cascade,
  constraint rede_metas_indicador_chk check (indicador in (
    'fat', 'pctMeta', 'comp', 'cmv', 'pessoal', 'preparo', 'cancel', 'ifood', 'online', 'rupturas', 'absent', 'turnover'
  )),
  constraint rede_metas_direcao_chk check (direcao is null or direcao in ('min', 'max')),
  -- meta definida exige direção; "só acompanhar" = meta nula e direção nula
  constraint rede_metas_par_chk check ((meta is null) = (direcao is null)),
  constraint rede_metas_vigencia_chk check (valido_ate is null or valido_ate >= valido_de)
);
create unique index if not exists rede_metas_vigente_uk
  on public.rede_metas (tenant_id, coalesce(loja_id, '00000000-0000-0000-0000-000000000000'::uuid), indicador)
  where valido_ate is null;
create index if not exists rede_metas_busca_idx on public.rede_metas (tenant_id, indicador, valido_de);

-- Meta de faturamento do mês por loja.
create table if not exists public.rede_metas_faturamento (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid not null,
  mes date not null,
  valor numeric(14,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_metas_fat_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  constraint rede_metas_fat_mes_chk check (mes = date_trunc('month', mes)::date),
  constraint rede_metas_fat_valor_chk check (valor > 0),
  constraint rede_metas_fat_uk unique (loja_id, mes)
);

-- Indicadores do mês lançados à mão (nota iFood, Comp etc., quando o módulo de
-- origem ainda não calcula). Quando houver valor calculado, ele tem prioridade.
create table if not exists public.rede_indicadores_mes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid not null,
  mes date not null,
  indicador text not null,
  valor numeric(14,4) not null,
  origem text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_ind_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  constraint rede_ind_mes_chk check (mes = date_trunc('month', mes)::date),
  constraint rede_ind_indicador_chk check (indicador in (
    'comp', 'cmv', 'pessoal', 'preparo', 'cancel', 'ifood', 'online', 'rupturas', 'absent', 'turnover'
  )),
  constraint rede_ind_origem_chk check (origem in ('manual', 'exemplo')),
  constraint rede_ind_uk unique (loja_id, mes, indicador)
);

-- ---------------------------------------------------------------------------
-- 4. Vendas
-- ---------------------------------------------------------------------------
create table if not exists public.rede_vendas_dia (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid not null,
  data date not null,
  venda_salao numeric(14,2) not null default 0,
  venda_delivery numeric(14,2) not null default 0,
  pedidos_salao integer not null default 0,
  pedidos_delivery integer not null default 0,
  origem text not null default 'manual',
  observacao text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_vd_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  constraint rede_vd_valores_chk check (venda_salao >= 0 and venda_delivery >= 0 and pedidos_salao >= 0 and pedidos_delivery >= 0),
  constraint rede_vd_origem_chk check (origem in ('manual', 'importacao', 'exemplo')),
  constraint rede_vd_uk unique (loja_id, data)
);
create index if not exists rede_vd_tenant_data_idx on public.rede_vendas_dia (tenant_id, data);

-- Venda do mês por faixa de hora (relatório "vendas por hora" do PDV).
create table if not exists public.rede_vendas_hora_mes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid not null,
  mes date not null,
  hora smallint not null,
  venda_salao numeric(14,2) not null default 0,
  venda_delivery numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_vh_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  constraint rede_vh_mes_chk check (mes = date_trunc('month', mes)::date),
  constraint rede_vh_hora_chk check (hora between 0 and 23),
  constraint rede_vh_valores_chk check (venda_salao >= 0 and venda_delivery >= 0),
  constraint rede_vh_uk unique (loja_id, mes, hora)
);

-- ---------------------------------------------------------------------------
-- 5. Histórico de alterações (gravado por trigger: vale mesmo para chamadas
--    diretas à API)
-- ---------------------------------------------------------------------------
create table if not exists public.rede_historico (
  id bigint generated always as identity primary key,
  tenant_id uuid not null,
  loja_id uuid,
  entidade text not null,
  registro_id uuid,
  acao text not null,
  antes jsonb,
  depois jsonb,
  user_id uuid,
  created_at timestamptz not null default now(),
  constraint rede_historico_acao_chk check (acao in ('insert', 'update', 'delete'))
);
create index if not exists rede_historico_tenant_idx on public.rede_historico (tenant_id, created_at desc);

create or replace function public.rede_historico_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
begin
  if tg_op = 'UPDATE' and (to_jsonb(old) - 'updated_at') = (to_jsonb(new) - 'updated_at') then
    return null;
  end if;
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.rede_historico (tenant_id, loja_id, entidade, registro_id, acao, antes, depois, user_id)
  values (
    (v_row ->> 'tenant_id')::uuid,
    coalesce(nullif(v_row ->> 'loja_id', '')::uuid, case when tg_table_name = 'rede_lojas' then nullif(v_row ->> 'id', '')::uuid end),
    tg_table_name,
    nullif(v_row ->> 'id', '')::uuid,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    auth.uid()
  );
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['rede_lojas', 'rede_acessos', 'rede_config', 'rede_metas', 'rede_metas_faturamento', 'rede_indicadores_mes', 'rede_vendas_dia']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_historico_trg', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.rede_historico_trg()', t || '_historico_trg', t);
  end loop;
  foreach t in array array['rede_lojas', 'rede_config', 'rede_metas_faturamento', 'rede_indicadores_mes', 'rede_vendas_dia', 'rede_vendas_hora_mes']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_trg', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_trg', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Funções de acesso (usadas pelo RLS e pela interface)
-- ---------------------------------------------------------------------------

-- Lojas a que o usuário tem QUALQUER acesso (para listar a loja na interface).
create or replace function public.rede_lojas_do_usuario()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select l.id
  from public.rede_lojas l
  join public.tenant_members tm on tm.tenant_id = l.tenant_id
  where auth.uid() is not null
    and tm.user_id = auth.uid() and tm.status = 'active' and tm.deactivated_at is null
    and tm.role in ('owner', 'admin')
  union
  select l.id
  from public.rede_lojas l
  join public.rede_acessos a on a.tenant_id = l.tenant_id and a.user_id = auth.uid() and a.status = 'active'
  join public.tenant_members tm on tm.tenant_id = a.tenant_id and tm.user_id = a.user_id
    and tm.status = 'active' and tm.deactivated_at is null
  where auth.uid() is not null
    and (a.todas_lojas or l.id = any (a.loja_ids));
$$;

-- Lojas que o usuário logado pode ver/editar em um módulo (todas as empresas).
create or replace function public.rede_lojas_permitidas(p_modulo text, p_escrita boolean default false)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select l.id
  from public.rede_lojas l
  join public.tenant_members tm on tm.tenant_id = l.tenant_id
  where auth.uid() is not null
    and tm.user_id = auth.uid() and tm.status = 'active' and tm.deactivated_at is null
    and tm.role in ('owner', 'admin')
  union
  select l.id
  from public.rede_lojas l
  join public.rede_acessos a on a.tenant_id = l.tenant_id and a.user_id = auth.uid() and a.status = 'active'
  join public.tenant_members tm on tm.tenant_id = a.tenant_id and tm.user_id = a.user_id
    and tm.status = 'active' and tm.deactivated_at is null
  where auth.uid() is not null
    and (a.todas_lojas or l.id = any (a.loja_ids))
    and (
      (a.papel = 'colaborador'
        and p_modulo = any (a.modulos)
        and (not p_escrita or p_modulo in ('vendas','cmv','rupturas','estoque_cc','delivery','qualidade','planos_acao')))
      or exists (
        select 1 from public.rede_papel_modulo pm
        where pm.papel = a.papel and pm.modulo = p_modulo
          and case when p_escrita then pm.pode_editar else pm.pode_ver end
      )
    );
$$;

-- Empresas em que o usuário pode ver/editar registros "da rede" (sem loja).
-- Escrita em nível de rede exige acesso a todas as lojas.
create or replace function public.rede_tenants_permitidos(p_modulo text, p_escrita boolean default false)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select tm.tenant_id
  from public.tenant_members tm
  where auth.uid() is not null
    and tm.user_id = auth.uid() and tm.status = 'active' and tm.deactivated_at is null
    and tm.role in ('owner', 'admin')
  union
  select a.tenant_id
  from public.rede_acessos a
  join public.tenant_members tm on tm.tenant_id = a.tenant_id and tm.user_id = a.user_id
    and tm.status = 'active' and tm.deactivated_at is null
  where auth.uid() is not null
    and a.user_id = auth.uid() and a.status = 'active'
    and (not p_escrita or a.todas_lojas)
    and (
      (a.papel = 'colaborador'
        and p_modulo = any (a.modulos)
        and (not p_escrita or p_modulo in ('vendas','cmv','rupturas','estoque_cc','delivery','qualidade','planos_acao')))
      or exists (
        select 1 from public.rede_papel_modulo pm
        where pm.papel = a.papel and pm.modulo = p_modulo
          and case when p_escrita then pm.pode_editar else pm.pode_ver end
      )
    );
$$;

-- Papel do usuário na empresa: 'administrador' | papel da rede | null.
create or replace function public.rede_papel(p_tenant uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then null
    when public.is_tenant_admin(p_tenant) then 'administrador'
    else (
      select a.papel from public.rede_acessos a
      join public.tenant_members tm on tm.tenant_id = a.tenant_id and tm.user_id = a.user_id
        and tm.status = 'active' and tm.deactivated_at is null
      where a.tenant_id = p_tenant and a.user_id = auth.uid() and a.status = 'active'
    )
  end;
$$;

-- Perfil de acesso para a interface (o que mostrar/esconder). O RLS continua
-- sendo a autoridade.
create or replace function public.rede_meu_perfil(p_tenant uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a public.rede_acessos%rowtype;
  v_mods jsonb := '{}'::jsonb;
  v_todos text[] := array['dashboard','vendas','metas','cmv','rupturas','estoque_cc','delivery','qualidade','planos_acao','dre','orcamento','rh_quadro','rh_movimentos','rh_ocorrencias','avaliacao_gerentes','nine_box','sucessao','relatorios','config'];
  v_escrita_colab text[] := array['vendas','cmv','rupturas','estoque_cc','delivery','qualidade','planos_acao'];
begin
  if auth.uid() is null then return null; end if;
  if not exists (
    select 1 from public.tenant_members tm
    where tm.tenant_id = p_tenant and tm.user_id = auth.uid() and tm.status = 'active' and tm.deactivated_at is null
  ) then
    return null;
  end if;

  if public.is_tenant_admin(p_tenant) then
    select jsonb_object_agg(x, jsonb_build_object('ver', true, 'editar', true)) into v_mods from unnest(v_todos) x;
    return jsonb_build_object('papel', 'administrador', 'todas_lojas', true, 'loja_ids', '[]'::jsonb, 'modulos', v_mods);
  end if;

  select * into a from public.rede_acessos where tenant_id = p_tenant and user_id = auth.uid() and status = 'active';
  if not found then return null; end if;

  if a.papel = 'colaborador' then
    select coalesce(jsonb_object_agg(x, jsonb_build_object('ver', true, 'editar', x = any (v_escrita_colab))), '{}'::jsonb)
      into v_mods from unnest(a.modulos) x;
  else
    select coalesce(jsonb_object_agg(pm.modulo, jsonb_build_object('ver', pm.pode_ver, 'editar', pm.pode_editar)), '{}'::jsonb)
      into v_mods from public.rede_papel_modulo pm where pm.papel = a.papel;
  end if;

  return jsonb_build_object('papel', a.papel, 'todas_lojas', a.todas_lojas, 'loja_ids', to_jsonb(a.loja_ids), 'modulos', v_mods);
end;
$$;

-- Define/atualiza uma meta mantendo o histórico (fecha a vigente, abre a nova).
-- SECURITY INVOKER: o RLS de rede_metas decide quem pode.
create or replace function public.rede_definir_meta(
  p_tenant uuid,
  p_loja uuid,
  p_indicador text,
  p_meta numeric,
  p_direcao text,
  p_vigencia date default current_date
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_atual record;
  v_id uuid;
begin
  select id, valido_de into v_atual
  from public.rede_metas
  where tenant_id = p_tenant
    and loja_id is not distinct from p_loja
    and indicador = p_indicador
    and valido_ate is null
  for update;

  if found then
    if v_atual.valido_de >= p_vigencia then
      update public.rede_metas set meta = p_meta, direcao = p_direcao where id = v_atual.id;
      return v_atual.id;
    end if;
    update public.rede_metas set valido_ate = p_vigencia - 1 where id = v_atual.id;
  end if;

  insert into public.rede_metas (tenant_id, loja_id, indicador, meta, direcao, valido_de)
  values (p_tenant, p_loja, p_indicador, p_meta, p_direcao, p_vigencia)
  returning id into v_id;
  return v_id;
end;
$$;

-- Prepara uma empresa para o módulo: configuração e metas iniciais da rede.
create or replace function public.rede_preparar_empresa(p_tenant uuid, p_ambiente text default 'real')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tenants set rede_operacional = true where id = p_tenant;

  insert into public.rede_config (tenant_id, ambiente) values (p_tenant, p_ambiente)
  on conflict (tenant_id) do nothing;

  insert into public.rede_metas (tenant_id, loja_id, indicador, meta, direcao, valido_de)
  select p_tenant, null, m.indicador, m.meta, m.direcao, date '2026-01-01'
  from (values
    ('fat', 500000::numeric, 'min'),
    ('pctMeta', 100::numeric, 'min'),
    ('comp', 6::numeric, 'min'),
    ('cmv', 21::numeric, 'max'),
    ('pessoal', 19::numeric, 'max'),
    ('preparo', 15::numeric, 'max'),
    ('cancel', 2::numeric, 'max'),
    ('ifood', 4.7::numeric, 'min'),
    ('online', 97::numeric, 'min'),
    ('rupturas', 5::numeric, 'max'),
    ('absent', null::numeric, null::text),
    ('turnover', null::numeric, null::text)
  ) as m(indicador, meta, direcao)
  where not exists (
    select 1 from public.rede_metas x
    where x.tenant_id = p_tenant and x.loja_id is null and x.indicador = m.indicador and x.valido_ate is null
  );
end;
$$;

-- Funções internas e de segurança não ficam expostas a anon/público.
revoke all on function public.rede_lojas_do_usuario() from public, anon;
revoke all on function public.rede_lojas_permitidas(text, boolean) from public, anon;
revoke all on function public.rede_tenants_permitidos(text, boolean) from public, anon;
revoke all on function public.rede_papel(uuid) from public, anon;
revoke all on function public.rede_meu_perfil(uuid) from public, anon;
revoke all on function public.rede_definir_meta(uuid, uuid, text, numeric, text, date) from public, anon;
revoke all on function public.rede_preparar_empresa(uuid, text) from public, anon, authenticated;
revoke all on function public.rede_historico_trg() from public, anon, authenticated;
revoke all on function public.rede_acessos_validar() from public, anon, authenticated;
grant execute on function public.rede_lojas_do_usuario() to authenticated;
grant execute on function public.rede_lojas_permitidas(text, boolean) to authenticated;
grant execute on function public.rede_tenants_permitidos(text, boolean) to authenticated;
grant execute on function public.rede_papel(uuid) to authenticated;
grant execute on function public.rede_meu_perfil(uuid) to authenticated;
grant execute on function public.rede_definir_meta(uuid, uuid, text, numeric, text, date) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. RLS
-- ---------------------------------------------------------------------------
alter table public.rede_lojas enable row level security;
alter table public.rede_papel_modulo enable row level security;
alter table public.rede_acessos enable row level security;
alter table public.rede_config enable row level security;
alter table public.rede_metas enable row level security;
alter table public.rede_metas_faturamento enable row level security;
alter table public.rede_indicadores_mes enable row level security;
alter table public.rede_vendas_dia enable row level security;
alter table public.rede_vendas_hora_mes enable row level security;
alter table public.rede_historico enable row level security;

-- Lojas: vê quem tem acesso à loja; só owner/admin da empresa cria/edita.
create policy rede_lojas_select on public.rede_lojas for select to authenticated
  using (id in (select public.rede_lojas_do_usuario()));
create policy rede_lojas_insert on public.rede_lojas for insert to authenticated
  with check (public.is_tenant_admin(tenant_id));
create policy rede_lojas_update on public.rede_lojas for update to authenticated
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));
create policy rede_lojas_delete on public.rede_lojas for delete to authenticated
  using (public.is_tenant_admin(tenant_id));

-- Tabela de referência: qualquer usuário autenticado lê; ninguém grava pela API.
create policy rede_papel_modulo_select on public.rede_papel_modulo for select to authenticated using (true);

-- Acessos: o próprio usuário vê o seu; owner/admin gerenciam todos.
create policy rede_acessos_select on public.rede_acessos for select to authenticated
  using (user_id = auth.uid() or public.is_tenant_admin(tenant_id));
create policy rede_acessos_insert on public.rede_acessos for insert to authenticated
  with check (public.is_tenant_admin(tenant_id));
create policy rede_acessos_update on public.rede_acessos for update to authenticated
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));
create policy rede_acessos_delete on public.rede_acessos for delete to authenticated
  using (public.is_tenant_admin(tenant_id));

-- Configuração da rede.
create policy rede_config_select on public.rede_config for select to authenticated
  using (tenant_id in (select public.rede_tenants_permitidos('dashboard', false)));
create policy rede_config_insert on public.rede_config for insert to authenticated
  with check (public.is_tenant_admin(tenant_id));
create policy rede_config_update on public.rede_config for update to authenticated
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));

-- Metas (padrão da rede quando loja_id é nulo).
create policy rede_metas_select on public.rede_metas for select to authenticated
  using (
    (loja_id is not null and loja_id in (select public.rede_lojas_permitidas('metas', false)))
    or (loja_id is null and tenant_id in (select public.rede_tenants_permitidos('metas', false)))
  );
create policy rede_metas_insert on public.rede_metas for insert to authenticated
  with check (
    (loja_id is not null and loja_id in (select public.rede_lojas_permitidas('metas', true)))
    or (loja_id is null and tenant_id in (select public.rede_tenants_permitidos('metas', true)))
  );
create policy rede_metas_update on public.rede_metas for update to authenticated
  using (
    (loja_id is not null and loja_id in (select public.rede_lojas_permitidas('metas', true)))
    or (loja_id is null and tenant_id in (select public.rede_tenants_permitidos('metas', true)))
  )
  with check (
    (loja_id is not null and loja_id in (select public.rede_lojas_permitidas('metas', true)))
    or (loja_id is null and tenant_id in (select public.rede_tenants_permitidos('metas', true)))
  );

-- Tabelas por loja: leitura/escrita pelo módulo correspondente.
create policy rede_metas_fat_select on public.rede_metas_faturamento for select to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('metas', false)));
create policy rede_metas_fat_insert on public.rede_metas_faturamento for insert to authenticated
  with check (loja_id in (select public.rede_lojas_permitidas('metas', true)));
create policy rede_metas_fat_update on public.rede_metas_faturamento for update to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('metas', true)))
  with check (loja_id in (select public.rede_lojas_permitidas('metas', true)));
create policy rede_metas_fat_delete on public.rede_metas_faturamento for delete to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('metas', true)));

create policy rede_ind_select on public.rede_indicadores_mes for select to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('metas', false)));
create policy rede_ind_insert on public.rede_indicadores_mes for insert to authenticated
  with check (loja_id in (select public.rede_lojas_permitidas('metas', true)));
create policy rede_ind_update on public.rede_indicadores_mes for update to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('metas', true)))
  with check (loja_id in (select public.rede_lojas_permitidas('metas', true)));
create policy rede_ind_delete on public.rede_indicadores_mes for delete to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('metas', true)));

create policy rede_vd_select on public.rede_vendas_dia for select to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('vendas', false)));
create policy rede_vd_insert on public.rede_vendas_dia for insert to authenticated
  with check (loja_id in (select public.rede_lojas_permitidas('vendas', true)));
create policy rede_vd_update on public.rede_vendas_dia for update to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('vendas', true)))
  with check (loja_id in (select public.rede_lojas_permitidas('vendas', true)));
create policy rede_vd_delete on public.rede_vendas_dia for delete to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('vendas', true)));

create policy rede_vh_select on public.rede_vendas_hora_mes for select to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('vendas', false)));
create policy rede_vh_insert on public.rede_vendas_hora_mes for insert to authenticated
  with check (loja_id in (select public.rede_lojas_permitidas('vendas', true)));
create policy rede_vh_update on public.rede_vendas_hora_mes for update to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('vendas', true)))
  with check (loja_id in (select public.rede_lojas_permitidas('vendas', true)));
create policy rede_vh_delete on public.rede_vendas_hora_mes for delete to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('vendas', true)));

-- Histórico: só leitura, só owner/admin e consultor. Ninguém grava pela API
-- (o trigger é SECURITY DEFINER).
create policy rede_historico_select on public.rede_historico for select to authenticated
  using (public.rede_papel(tenant_id) in ('administrador', 'consultor'));

-- Sem acesso anônimo a nada deste módulo.
revoke all on public.rede_lojas, public.rede_papel_modulo, public.rede_acessos, public.rede_config,
  public.rede_metas, public.rede_metas_faturamento, public.rede_indicadores_mes,
  public.rede_vendas_dia, public.rede_vendas_hora_mes, public.rede_historico from anon;
