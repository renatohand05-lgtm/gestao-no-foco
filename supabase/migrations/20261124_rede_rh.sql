-- Rede de lojas — rodada 18: RH (quadro de pessoal, turnover, absenteísmo e ocorrências).
--
-- * rede_rh_colaboradores: cadastro de pessoas por loja (nome, cargo, admissão, situação). Sem CPF, salário ou
--   qualquer dado além do necessário ao quadro. "Ativo" e "tempo de casa" são calculados do cadastro, nunca gravados.
-- * rede_rh_quadro_previsto: quantas pessoas cada loja deve ter em cada cargo. O realizado vem do cadastro.
-- * rede_rh_mensal: lançamento mensal por loja (headcount médio, admissões, desligamentos, dias de falta, dias
--   previstos). Turnover e absenteísmo NÃO são gravados: são calculados dessas contagens.
-- * rede_rh_ocorrencias: advertências, suspensões, faltas, atestados, elogios etc., com status de assinatura.
--   Dado pessoal: só enxerga quem tem o módulo "rh_ocorrencias" (e só nas lojas do seu acesso).
--
-- Permissões: as mesmas funções das outras rodadas (rede_lojas_permitidas) com os módulos rh_quadro (cadastro e
-- quadro previsto), rh_movimentos (lançamento mensal) e rh_ocorrencias. Nenhuma tabela existente é alterada.

create table if not exists public.rede_rh_colaboradores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid not null,
  nome text not null,
  cargo text not null,
  data_admissao date not null,
  status text not null default 'ativo',
  data_desligamento date,
  motivo_desligamento text,
  observacoes text,
  origem text not null default 'manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_rh_colab_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  constraint rede_rh_colab_chave_uk unique (tenant_id, loja_id, id),
  constraint rede_rh_colab_nome_chk check (char_length(btrim(nome)) between 2 and 120),
  constraint rede_rh_colab_cargo_chk check (cargo in ('gerente_loja', 'chefe_cozinha', 'lider_delivery', 'auxiliar_cozinha', 'atendente')),
  constraint rede_rh_colab_adm_chk check (data_admissao between date '1990-01-01' and date '2100-12-31'),
  constraint rede_rh_colab_status_chk check (status in ('ativo', 'desligado')),
  constraint rede_rh_colab_deslig_chk check ((status = 'desligado') = (data_desligamento is not null)),
  constraint rede_rh_colab_deslig_data_chk check (data_desligamento is null or data_desligamento >= data_admissao),
  constraint rede_rh_colab_motivo_chk check (motivo_desligamento is null or (status = 'desligado' and char_length(btrim(motivo_desligamento)) between 1 and 300)),
  constraint rede_rh_colab_obs_chk check (char_length(coalesce(observacoes, '')) <= 500),
  constraint rede_rh_colab_origem_chk check (origem in ('manual', 'exemplo'))
);
-- Dois colaboradores ATIVOS com o mesmo nome na mesma loja quase sempre são cadastro em duplicidade.
create unique index if not exists rede_rh_colab_nome_uk on public.rede_rh_colaboradores (loja_id, lower(btrim(nome))) where status = 'ativo';
create index if not exists rede_rh_colab_tenant_loja_idx on public.rede_rh_colaboradores (tenant_id, loja_id, status);
create index if not exists rede_rh_colab_loja_idx on public.rede_rh_colaboradores (loja_id, status);
comment on table public.rede_rh_colaboradores is
  'Colaboradores por loja. Ativo/tempo de casa são calculados do cadastro. Sem CPF nem salário. origem = exemplo só na empresa de demonstração.';

create table if not exists public.rede_rh_quadro_previsto (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid not null,
  cargo text not null,
  previsto smallint not null,
  origem text not null default 'manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_rh_qp_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  constraint rede_rh_qp_cargo_chk check (cargo in ('gerente_loja', 'chefe_cozinha', 'lider_delivery', 'auxiliar_cozinha', 'atendente')),
  constraint rede_rh_qp_prev_chk check (previsto between 0 and 99),
  constraint rede_rh_qp_origem_chk check (origem in ('manual', 'exemplo')),
  constraint rede_rh_qp_uk unique (loja_id, cargo)
);
create index if not exists rede_rh_qp_tenant_loja_idx on public.rede_rh_quadro_previsto (tenant_id, loja_id);
comment on table public.rede_rh_quadro_previsto is 'Quadro previsto por loja e cargo. O realizado (ativos) vem do cadastro de colaboradores.';

create table if not exists public.rede_rh_mensal (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid not null,
  mes date not null,
  headcount_medio numeric(7, 1) not null,
  admissoes integer not null default 0,
  desligamentos integer not null default 0,
  dias_falta integer not null default 0,
  dias_previstos integer not null,
  origem text not null default 'manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_rh_m_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  constraint rede_rh_m_mes_chk check (extract(day from mes) = 1 and mes between date '2020-01-01' and date '2100-12-01'),
  constraint rede_rh_m_hc_chk check (headcount_medio > 0 and headcount_medio <= 5000),
  constraint rede_rh_m_adm_chk check (admissoes between 0 and 1000),
  constraint rede_rh_m_des_chk check (desligamentos between 0 and 1000),
  constraint rede_rh_m_prev_chk check (dias_previstos between 1 and 200000),
  constraint rede_rh_m_falta_chk check (dias_falta between 0 and dias_previstos),
  constraint rede_rh_m_origem_chk check (origem in ('manual', 'exemplo')),
  constraint rede_rh_m_uk unique (loja_id, mes)
);
create index if not exists rede_rh_m_tenant_loja_mes_idx on public.rede_rh_mensal (tenant_id, loja_id, mes desc);
comment on table public.rede_rh_mensal is
  'Lançamento mensal de RH por loja. Turnover = ((admissões + desligamentos) ÷ 2) ÷ headcount médio; absenteísmo = dias de falta ÷ dias previstos. Ambos calculados, não gravados.';

create table if not exists public.rede_rh_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid not null,
  colaborador_id uuid not null,
  tipo text not null,
  data date not null,
  status text not null default 'registrada',
  motivo text not null,
  responsavel text,
  observacoes text,
  origem text not null default 'manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_rh_oco_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  -- O colaborador precisa ser da mesma loja da ocorrência; e quem tem ocorrência não muda de loja nem é excluído.
  constraint rede_rh_oco_colab_fk foreign key (tenant_id, loja_id, colaborador_id) references public.rede_rh_colaboradores (tenant_id, loja_id, id) on delete restrict,
  constraint rede_rh_oco_tipo_chk check (tipo in (
    'advertencia_verbal', 'advertencia_escrita', 'suspensao', 'falta_injustificada', 'atraso',
    'atestado_medico', 'feedback', 'elogio', 'treinamento', 'desligamento'
  )),
  constraint rede_rh_oco_data_chk check (data between date '2000-01-01' and date '2100-12-31'),
  constraint rede_rh_oco_status_chk check (status in ('registrada', 'aguardando_assinatura', 'assinada', 'recusou_assinar', 'concluida')),
  constraint rede_rh_oco_motivo_chk check (char_length(btrim(motivo)) between 1 and 300),
  constraint rede_rh_oco_resp_chk check (char_length(coalesce(responsavel, '')) <= 120),
  constraint rede_rh_oco_obs_chk check (char_length(coalesce(observacoes, '')) <= 1000),
  constraint rede_rh_oco_origem_chk check (origem in ('manual', 'exemplo'))
);
create index if not exists rede_rh_oco_tenant_loja_data_idx on public.rede_rh_ocorrencias (tenant_id, loja_id, data desc);
create index if not exists rede_rh_oco_colab_idx on public.rede_rh_ocorrencias (tenant_id, loja_id, colaborador_id, data desc);
create index if not exists rede_rh_oco_loja_data_idx on public.rede_rh_ocorrencias (loja_id, data desc);
comment on table public.rede_rh_ocorrencias is
  'Ocorrências e advertências de RH. Dado pessoal: acesso restrito (módulo rh_ocorrencias). Não registrar diagnóstico/CID em atestados.';

/* ------------------------------------------------------------------ validações */

-- A chave de um registro (empresa, loja, mês, cargo) não muda depois de salva: para mudar, exclua e lance de novo.
create or replace function public.rede_rh_travar_chave()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  c text;
begin
  foreach c in array tg_argv loop
    if to_jsonb(new) -> c is distinct from to_jsonb(old) -> c then
      raise exception 'Loja, mês e cargo de um registro não podem ser alterados depois de salvo; exclua e lance novamente.' using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;

-- Colaborador: a admissão não pode ficar depois de uma ocorrência já registrada para ele.
-- (security definer: a checagem enxerga todas as ocorrências, mesmo que quem edita o cadastro não as veja.)
create or replace function public.rede_rh_colab_validar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.data_admissao > old.data_admissao
     and exists (select 1 from public.rede_rh_ocorrencias o where o.colaborador_id = new.id and o.data < new.data_admissao) then
    raise exception 'Há ocorrências anteriores a esta data de admissão. Corrija as ocorrências antes.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.rede_rh_colab_validar() from public, anon, authenticated;

-- Ocorrência: não pode ser anterior à admissão do colaborador.
create or replace function public.rede_rh_oco_validar()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_adm date;
begin
  select c.data_admissao into v_adm from public.rede_rh_colaboradores c
   where c.id = new.colaborador_id and c.tenant_id = new.tenant_id and c.loja_id = new.loja_id;
  if v_adm is not null and new.data < v_adm then
    raise exception 'A data da ocorrência é anterior à admissão do colaborador (%).', to_char(v_adm, 'DD/MM/YYYY') using errcode = '23514';
  end if;
  return new;
end;
$$;

do $$
begin
  drop trigger if exists rede_rh_colab_travar_trg on public.rede_rh_colaboradores;
  create trigger rede_rh_colab_travar_trg before update on public.rede_rh_colaboradores
    for each row execute function public.rede_rh_travar_chave('tenant_id');
  drop trigger if exists rede_rh_colab_validar_trg on public.rede_rh_colaboradores;
  create trigger rede_rh_colab_validar_trg before insert or update on public.rede_rh_colaboradores
    for each row execute function public.rede_rh_colab_validar();

  drop trigger if exists rede_rh_qp_travar_trg on public.rede_rh_quadro_previsto;
  create trigger rede_rh_qp_travar_trg before update on public.rede_rh_quadro_previsto
    for each row execute function public.rede_rh_travar_chave('tenant_id', 'loja_id', 'cargo');

  drop trigger if exists rede_rh_m_travar_trg on public.rede_rh_mensal;
  create trigger rede_rh_m_travar_trg before update on public.rede_rh_mensal
    for each row execute function public.rede_rh_travar_chave('tenant_id', 'loja_id', 'mes');

  drop trigger if exists rede_rh_oco_travar_trg on public.rede_rh_ocorrencias;
  create trigger rede_rh_oco_travar_trg before update on public.rede_rh_ocorrencias
    for each row execute function public.rede_rh_travar_chave('tenant_id', 'loja_id');
  drop trigger if exists rede_rh_oco_validar_trg on public.rede_rh_ocorrencias;
  create trigger rede_rh_oco_validar_trg before insert or update on public.rede_rh_ocorrencias
    for each row execute function public.rede_rh_oco_validar();
end $$;

/* ------------------------------------------------------------------ atualização e histórico */

do $$
declare
  t text;
begin
  foreach t in array array['rede_rh_colaboradores', 'rede_rh_quadro_previsto', 'rede_rh_mensal', 'rede_rh_ocorrencias']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_trg', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_trg', t);
    execute format('drop trigger if exists %I on public.%I', t || '_historico_trg', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.rede_historico_trg()', t || '_historico_trg', t);
  end loop;
end $$;

/* ------------------------------------------------------------------ permissões (RLS) */

alter table public.rede_rh_colaboradores enable row level security;
alter table public.rede_rh_quadro_previsto enable row level security;
alter table public.rede_rh_mensal enable row level security;
alter table public.rede_rh_ocorrencias enable row level security;

create policy rede_rh_colab_select on public.rede_rh_colaboradores for select to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('rh_quadro', false)));
create policy rede_rh_colab_insert on public.rede_rh_colaboradores for insert to authenticated
  with check (loja_id in (select public.rede_lojas_permitidas('rh_quadro', true)));
create policy rede_rh_colab_update on public.rede_rh_colaboradores for update to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('rh_quadro', true)))
  with check (loja_id in (select public.rede_lojas_permitidas('rh_quadro', true)));
create policy rede_rh_colab_delete on public.rede_rh_colaboradores for delete to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('rh_quadro', true)));

create policy rede_rh_qp_select on public.rede_rh_quadro_previsto for select to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('rh_quadro', false)));
create policy rede_rh_qp_insert on public.rede_rh_quadro_previsto for insert to authenticated
  with check (loja_id in (select public.rede_lojas_permitidas('rh_quadro', true)));
create policy rede_rh_qp_update on public.rede_rh_quadro_previsto for update to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('rh_quadro', true)))
  with check (loja_id in (select public.rede_lojas_permitidas('rh_quadro', true)));
create policy rede_rh_qp_delete on public.rede_rh_quadro_previsto for delete to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('rh_quadro', true)));

create policy rede_rh_m_select on public.rede_rh_mensal for select to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('rh_movimentos', false)));
create policy rede_rh_m_insert on public.rede_rh_mensal for insert to authenticated
  with check (loja_id in (select public.rede_lojas_permitidas('rh_movimentos', true)));
create policy rede_rh_m_update on public.rede_rh_mensal for update to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('rh_movimentos', true)))
  with check (loja_id in (select public.rede_lojas_permitidas('rh_movimentos', true)));
create policy rede_rh_m_delete on public.rede_rh_mensal for delete to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('rh_movimentos', true)));

create policy rede_rh_oco_select on public.rede_rh_ocorrencias for select to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('rh_ocorrencias', false)));
create policy rede_rh_oco_insert on public.rede_rh_ocorrencias for insert to authenticated
  with check (loja_id in (select public.rede_lojas_permitidas('rh_ocorrencias', true)));
create policy rede_rh_oco_update on public.rede_rh_ocorrencias for update to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('rh_ocorrencias', true)))
  with check (loja_id in (select public.rede_lojas_permitidas('rh_ocorrencias', true)));
create policy rede_rh_oco_delete on public.rede_rh_ocorrencias for delete to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('rh_ocorrencias', true)));
