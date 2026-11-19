-- Rede de lojas — rodada 19: talentos (avaliação de gerentes, Nine Box, sucessão e carreira).
--
-- * rede_rh_ninebox: avaliação de desempenho e de potencial (1 baixo, 2 médio, 3 alto) de cada colaborador. O
--   quadrante, a contagem por quadrante, o mapa de sucessão e a prontidão são calculados dessas duas notas.
-- * rede_rh_lideranca: nota de liderança (0 a 5) de cada gerente de loja em cada mês, dada por quem avalia. É o
--   único dado do score do gerente que não vem de outro módulo: vendas x meta, indicadores na meta, nota da última
--   visita de qualidade, turnover e absenteísmo vêm das telas que já existem. O SCORE NÃO É GRAVADO: guardá-lo
--   duplicaria vendas, indicadores, qualidade e RH e ficaria desatualizado a cada lançamento novo.
-- * rede_rh_criterios_cargo: critério de promoção e tempo mínimo por cargo (por empresa). Sem linha, vale o padrão do
--   painel original, que está no aplicativo; a linha só existe quando o consultor ajusta.
--
-- Trilhas de carreira e mapa de sucessão também não têm tabela: as trilhas são as do painel original e o mapa é
-- calculado do Nine Box (a mudança de uma nota atualiza a sucessão na hora).
--
-- Permissões: módulos avaliacao_gerentes, nine_box e sucessao (matriz de perfis da rodada 14: consultor e
-- administrador editam; diretoria e gerente regional só veem; gerente de loja e colaborador não têm acesso).
-- Aditiva: nenhuma tabela existente é alterada.

create table if not exists public.rede_rh_ninebox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid not null,
  colaborador_id uuid not null,
  desempenho smallint not null,
  potencial smallint not null,
  observacoes text,
  origem text not null default 'manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_rh_nb_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  -- Se o colaborador mudar de loja, a avaliação acompanha; se o cadastro for excluído, a avaliação sai junto.
  constraint rede_rh_nb_colab_fk foreign key (tenant_id, loja_id, colaborador_id) references public.rede_rh_colaboradores (tenant_id, loja_id, id) on update cascade on delete cascade,
  constraint rede_rh_nb_desemp_chk check (desempenho between 1 and 3),
  constraint rede_rh_nb_pot_chk check (potencial between 1 and 3),
  constraint rede_rh_nb_obs_chk check (char_length(coalesce(observacoes, '')) <= 500),
  constraint rede_rh_nb_origem_chk check (origem in ('manual', 'exemplo')),
  constraint rede_rh_nb_uk unique (colaborador_id)
);
create index if not exists rede_rh_nb_tenant_loja_idx on public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id);
create index if not exists rede_rh_nb_loja_idx on public.rede_rh_ninebox (loja_id);
comment on table public.rede_rh_ninebox is
  'Nine Box: desempenho e potencial (1 a 3) por colaborador. Quadrante, sucessão e prontidão são calculados; histórico em rede_historico.';

create table if not exists public.rede_rh_lideranca (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid not null,
  colaborador_id uuid not null,
  mes date not null,
  nota numeric(2, 1) not null,
  observacoes text,
  origem text not null default 'manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_rh_lid_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  constraint rede_rh_lid_colab_fk foreign key (tenant_id, loja_id, colaborador_id) references public.rede_rh_colaboradores (tenant_id, loja_id, id) on update cascade on delete cascade,
  constraint rede_rh_lid_mes_chk check (extract(day from mes) = 1 and mes between date '2020-01-01' and date '2100-12-01'),
  constraint rede_rh_lid_nota_chk check (nota between 0 and 5),
  constraint rede_rh_lid_obs_chk check (char_length(coalesce(observacoes, '')) <= 500),
  constraint rede_rh_lid_origem_chk check (origem in ('manual', 'exemplo')),
  constraint rede_rh_lid_uk unique (colaborador_id, mes)
);
create index if not exists rede_rh_lid_tenant_loja_mes_idx on public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes desc);
create index if not exists rede_rh_lid_loja_idx on public.rede_rh_lideranca (loja_id);
comment on table public.rede_rh_lideranca is
  'Nota de liderança (0 a 5) do gerente de loja por mês. O score do gerente é calculado e não é gravado.';

create table if not exists public.rede_rh_criterios_cargo (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cargo text not null,
  tempo_minimo_meses smallint,
  criterio text not null,
  origem text not null default 'manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_rh_crit_cargo_chk check (cargo in ('gerente_loja', 'chefe_cozinha', 'lider_delivery', 'auxiliar_cozinha', 'atendente', 'supervisor_regional')),
  constraint rede_rh_crit_tempo_chk check (tempo_minimo_meses is null or tempo_minimo_meses between 0 and 120),
  constraint rede_rh_crit_texto_chk check (char_length(btrim(criterio)) between 1 and 500),
  constraint rede_rh_crit_origem_chk check (origem in ('manual', 'exemplo')),
  constraint rede_rh_crit_uk unique (tenant_id, cargo)
);
comment on table public.rede_rh_criterios_cargo is
  'Critério de promoção e tempo mínimo por cargo, por empresa. Sem linha vale o padrão do painel original (no aplicativo).';

/* ------------------------------------------------------------------ validações */

-- Nine Box: só colaborador ativo recebe (ou muda) avaliação.
-- (security definer não é necessário: quem grava a avaliação precisa enxergar o cadastro pelo módulo rh_quadro;
-- se não enxergar, a consulta não acha o colaborador e a gravação é recusada.)
create or replace function public.rede_rh_nb_validar()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_status text;
begin
  if tg_op = 'UPDATE' and new.desempenho = old.desempenho and new.potencial = old.potencial then
    return new;
  end if;
  select c.status into v_status from public.rede_rh_colaboradores c
   where c.id = new.colaborador_id and c.tenant_id = new.tenant_id and c.loja_id = new.loja_id;
  if v_status is distinct from 'ativo' then
    raise exception 'Só colaborador ativo pode ser avaliado no Nine Box.' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Liderança: só de gerente de loja, em mês em que ele já estava na empresa e (se saiu) ainda estava.
create or replace function public.rede_rh_lid_validar()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_cargo text;
  v_adm date;
  v_des date;
begin
  select c.cargo, c.data_admissao, c.data_desligamento into v_cargo, v_adm, v_des from public.rede_rh_colaboradores c
   where c.id = new.colaborador_id and c.tenant_id = new.tenant_id and c.loja_id = new.loja_id;
  if v_cargo is distinct from 'gerente_loja' then
    raise exception 'A nota de liderança é só para gerente de loja.' using errcode = '23514';
  end if;
  if new.mes < date_trunc('month', v_adm)::date then
    raise exception 'O mês é anterior à admissão do gerente (%).', to_char(v_adm, 'DD/MM/YYYY') using errcode = '23514';
  end if;
  if v_des is not null and new.mes > date_trunc('month', v_des)::date then
    raise exception 'O mês é posterior ao desligamento do gerente (%).', to_char(v_des, 'DD/MM/YYYY') using errcode = '23514';
  end if;
  return new;
end;
$$;

-- A chave do registro não muda depois de salvo (para mudar o mês, exclua e lance de novo).
do $$
begin
  drop trigger if exists rede_rh_nb_validar_trg on public.rede_rh_ninebox;
  create trigger rede_rh_nb_validar_trg before insert or update on public.rede_rh_ninebox
    for each row execute function public.rede_rh_nb_validar();
  drop trigger if exists rede_rh_nb_travar_trg on public.rede_rh_ninebox;
  create trigger rede_rh_nb_travar_trg before update on public.rede_rh_ninebox
    for each row execute function public.rede_rh_travar_chave('tenant_id', 'colaborador_id');

  drop trigger if exists rede_rh_lid_validar_trg on public.rede_rh_lideranca;
  create trigger rede_rh_lid_validar_trg before insert or update on public.rede_rh_lideranca
    for each row execute function public.rede_rh_lid_validar();
  drop trigger if exists rede_rh_lid_travar_trg on public.rede_rh_lideranca;
  create trigger rede_rh_lid_travar_trg before update on public.rede_rh_lideranca
    for each row execute function public.rede_rh_travar_chave('tenant_id', 'colaborador_id', 'mes');

  drop trigger if exists rede_rh_crit_travar_trg on public.rede_rh_criterios_cargo;
  create trigger rede_rh_crit_travar_trg before update on public.rede_rh_criterios_cargo
    for each row execute function public.rede_rh_travar_chave('tenant_id', 'cargo');
end $$;

/* ------------------------------------------------------------------ atualização e histórico */

do $$
declare
  t text;
begin
  foreach t in array array['rede_rh_ninebox', 'rede_rh_lideranca', 'rede_rh_criterios_cargo']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_trg', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_trg', t);
    execute format('drop trigger if exists %I on public.%I', t || '_historico_trg', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.rede_historico_trg()', t || '_historico_trg', t);
  end loop;
end $$;

/* ------------------------------------------------------------------ permissões (RLS) */

alter table public.rede_rh_ninebox enable row level security;
alter table public.rede_rh_lideranca enable row level security;
alter table public.rede_rh_criterios_cargo enable row level security;

create policy rede_rh_nb_select on public.rede_rh_ninebox for select to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('nine_box', false)));
create policy rede_rh_nb_insert on public.rede_rh_ninebox for insert to authenticated
  with check (loja_id in (select public.rede_lojas_permitidas('nine_box', true)));
create policy rede_rh_nb_update on public.rede_rh_ninebox for update to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('nine_box', true)))
  with check (loja_id in (select public.rede_lojas_permitidas('nine_box', true)));
create policy rede_rh_nb_delete on public.rede_rh_ninebox for delete to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('nine_box', true)));

create policy rede_rh_lid_select on public.rede_rh_lideranca for select to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('avaliacao_gerentes', false)));
create policy rede_rh_lid_insert on public.rede_rh_lideranca for insert to authenticated
  with check (loja_id in (select public.rede_lojas_permitidas('avaliacao_gerentes', true)));
create policy rede_rh_lid_update on public.rede_rh_lideranca for update to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('avaliacao_gerentes', true)))
  with check (loja_id in (select public.rede_lojas_permitidas('avaliacao_gerentes', true)));
create policy rede_rh_lid_delete on public.rede_rh_lideranca for delete to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('avaliacao_gerentes', true)));

-- Critérios de carreira são da empresa toda (como o estoque da cozinha central): gravar exige acesso a todas as lojas.
create policy rede_rh_crit_select on public.rede_rh_criterios_cargo for select to authenticated
  using (tenant_id in (select public.rede_tenants_permitidos('sucessao', false)));
create policy rede_rh_crit_insert on public.rede_rh_criterios_cargo for insert to authenticated
  with check (tenant_id in (select public.rede_tenants_permitidos('sucessao', true)));
create policy rede_rh_crit_update on public.rede_rh_criterios_cargo for update to authenticated
  using (tenant_id in (select public.rede_tenants_permitidos('sucessao', true)))
  with check (tenant_id in (select public.rede_tenants_permitidos('sucessao', true)));
create policy rede_rh_crit_delete on public.rede_rh_criterios_cargo for delete to authenticated
  using (tenant_id in (select public.rede_tenants_permitidos('sucessao', true)));
