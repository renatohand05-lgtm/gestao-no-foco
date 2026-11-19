-- Rede de lojas — rodada 17: checklist de qualidade (visitas) e planos de ação centralizados.
--
-- * rede_qualidade_visitas: uma visita por loja/dia/avaliador, com as respostas dos 34 itens (Sim/Não/N/A + observação).
--   A nota NÃO é gravada: ela é calculada das respostas (Sim ÷ (Sim + Não) × 100), para nunca ficar fora de sincronia.
-- * rede_planos_acao: controle central de ações corretivas. Nascem dos desvios das visitas de qualidade (um plano por
--   item "Não") e dos checklists de delivery, ou são lançados à mão. "Atrasado" não é gravado: é prazo vencido de um
--   plano ainda aberto (pendente / em andamento).
-- * rede_qualidade_salvar(): grava a visita e sincroniza os planos dos itens "Não" na MESMA transação (security invoker:
--   as permissões das tabelas continuam valendo).
--
-- Nenhuma tabela existente é alterada; só se acrescentam gatilhos de "desvincular" nas visitas e nos checklists de delivery.

create table if not exists public.rede_qualidade_visitas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid not null,
  data date not null,
  avaliador text not null,
  gerente text,
  versao smallint not null default 1,
  respostas jsonb not null default '{}'::jsonb,
  origem text not null default 'manual',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_qv_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  constraint rede_qv_aval_chk check (char_length(btrim(avaliador)) between 1 and 120),
  constraint rede_qv_ger_chk check (char_length(coalesce(gerente, '')) <= 120),
  constraint rede_qv_versao_chk check (versao >= 1),
  constraint rede_qv_data_chk check (data >= date '2020-01-01'),
  constraint rede_qv_origem_chk check (origem in ('manual', 'exemplo'))
);
create unique index if not exists rede_qv_uk on public.rede_qualidade_visitas (loja_id, data, lower(btrim(avaliador)));
create index if not exists rede_qv_tenant_loja_data_idx on public.rede_qualidade_visitas (tenant_id, loja_id, data desc);
create index if not exists rede_qv_loja_data_idx on public.rede_qualidade_visitas (loja_id, data desc);
comment on table public.rede_qualidade_visitas is
  'Visitas de qualidade às lojas. respostas = {"<seção>-<item>": {"v": "sim|nao|na", "o": "observação"}}; a nota é calculada, não gravada.';

create table if not exists public.rede_planos_acao (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  loja_id uuid not null,
  origem_tipo text not null,
  origem_id uuid,
  origem_ref text,
  origem_rotulo text not null,
  descricao text not null,
  acao text,
  responsavel text,
  prazo date,
  prioridade text not null default 'media',
  status text not null default 'pendente',
  data_conclusao date,
  evidencia text,
  observacoes text,
  verificado_em timestamptz,
  verificado_por uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rede_pa_loja_fk foreign key (tenant_id, loja_id) references public.rede_lojas (tenant_id, id) on delete restrict,
  constraint rede_pa_origem_chk check (origem_tipo in ('qualidade', 'delivery', 'indicador', 'manual')),
  constraint rede_pa_ref_chk check (origem_id is null or origem_ref is not null),
  constraint rede_pa_rotulo_chk check (char_length(btrim(origem_rotulo)) between 1 and 200),
  constraint rede_pa_ref_len_chk check (char_length(coalesce(origem_ref, '')) <= 60),
  constraint rede_pa_desc_chk check (char_length(btrim(descricao)) between 1 and 500),
  constraint rede_pa_acao_len_chk check (char_length(coalesce(acao, '')) <= 600),
  constraint rede_pa_resp_chk check (char_length(coalesce(responsavel, '')) <= 120),
  constraint rede_pa_prazo_chk check (prazo is null or prazo between date '2020-01-01' and date '2100-12-31'),
  constraint rede_pa_prior_chk check (prioridade in ('baixa', 'media', 'alta')),
  constraint rede_pa_status_chk check (status in ('pendente', 'em_andamento', 'concluido', 'cancelado')),
  constraint rede_pa_conclusao_chk check ((status = 'concluido') = (data_conclusao is not null)),
  constraint rede_pa_verif_chk check (verificado_em is null or status = 'concluido'),
  constraint rede_pa_evid_chk check (char_length(coalesce(evidencia, '')) <= 600),
  constraint rede_pa_obs_chk check (char_length(coalesce(observacoes, '')) <= 1000),
  constraint rede_pa_acao_exigida_chk check (status in ('pendente', 'cancelado') or char_length(btrim(coalesce(acao, ''))) > 0)
);
-- Um plano por desvio de cada registro de origem (visita + item, checklist de delivery + indicador/rotina).
create unique index if not exists rede_pa_origem_uk on public.rede_planos_acao (origem_tipo, origem_id, origem_ref) where origem_id is not null;
create index if not exists rede_pa_tenant_loja_status_idx on public.rede_planos_acao (tenant_id, loja_id, status, prazo);
create index if not exists rede_pa_loja_status_idx on public.rede_planos_acao (loja_id, status, prazo);
comment on table public.rede_planos_acao is
  'Planos de ação da rede. "Atrasado" não é gravado: é prazo vencido de plano pendente/em andamento. origem_id/origem_ref ligam ao desvio (visita+item, checklist de delivery+indicador).';

/* ------------------------------------------------------------------ validações */

create or replace function public.rede_qualidade_validar()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  k text;
  v jsonb;
  r text;
  si int;
  ii int;
  n_av int := 0;
  tamanhos int[] := array[6, 6, 6, 6, 5, 5];
begin
  if tg_op = 'UPDATE' and (new.loja_id <> old.loja_id or new.tenant_id <> old.tenant_id) then
    raise exception 'A loja de uma visita não pode ser alterada.' using errcode = '23514';
  end if;
  if jsonb_typeof(new.respostas) is distinct from 'object' then
    raise exception 'Respostas do checklist inválidas.' using errcode = '23514';
  end if;
  for k, v in select * from jsonb_each(new.respostas) loop
    if k !~ '^[0-5]-[0-5]$' then
      raise exception 'Resposta do checklist inválida: item fora da lista.' using errcode = '23514';
    end if;
    si := split_part(k, '-', 1)::int;
    ii := split_part(k, '-', 2)::int;
    if ii >= tamanhos[si + 1] then
      raise exception 'Resposta do checklist inválida: item fora da lista.' using errcode = '23514';
    end if;
    if jsonb_typeof(v) <> 'object' or exists (select 1 from jsonb_object_keys(v) kk where kk not in ('v', 'o')) then
      raise exception 'Resposta do checklist inválida.' using errcode = '23514';
    end if;
    if v ? 'v' then
      if jsonb_typeof(v -> 'v') <> 'string' or (v ->> 'v') not in ('sim', 'nao', 'na') then
        raise exception 'Responda Sim, Não ou Não se aplica.' using errcode = '23514';
      end if;
      r := v ->> 'v';
      if r in ('sim', 'nao') then n_av := n_av + 1; end if;
    end if;
    if v ? 'o' and (jsonb_typeof(v -> 'o') <> 'string' or char_length(v ->> 'o') > 300) then
      raise exception 'Observação com mais de 300 caracteres.' using errcode = '23514';
    end if;
  end loop;
  if n_av = 0 then
    raise exception 'Avalie pelo menos um item (Sim ou Não) antes de salvar a visita.' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists rede_qv_validar_trg on public.rede_qualidade_visitas;
create trigger rede_qv_validar_trg before insert or update on public.rede_qualidade_visitas
  for each row execute function public.rede_qualidade_validar();

create or replace function public.rede_planos_validar()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_papel text;
begin
  if tg_op = 'UPDATE' then
    if new.tenant_id <> old.tenant_id or new.loja_id <> old.loja_id then
      raise exception 'A loja de um plano de ação não pode ser alterada.' using errcode = '23514';
    end if;
    if new.origem_tipo <> old.origem_tipo then
      raise exception 'A origem de um plano de ação não pode ser alterada.' using errcode = '23514';
    end if;
    -- O vínculo com o registro de origem só pode ser desfeito (quando o registro é excluído), nunca trocado.
    if new.origem_id is not null and (new.origem_id is distinct from old.origem_id or new.origem_ref is distinct from old.origem_ref) then
      raise exception 'O registro de origem de um plano de ação não pode ser trocado.' using errcode = '23514';
    end if;
  end if;

  if new.status in ('em_andamento', 'concluido') and char_length(btrim(coalesce(new.acao, ''))) = 0 then
    raise exception 'Informe a ação corretiva antes de iniciar ou concluir o plano.' using errcode = '23514';
  end if;

  if new.status <> 'concluido' and new.verificado_em is not null and (tg_op = 'INSERT' or old.verificado_em is null) then
    raise exception 'Só é possível verificar um plano concluído.' using errcode = '23514';
  end if;

  if new.status = 'concluido' then
    if new.data_conclusao is null then
      new.data_conclusao := (now() at time zone 'America/Sao_Paulo')::date;
    end if;
  else
    new.data_conclusao := null;
    new.verificado_em := null;
    new.verificado_por := null;
  end if;

  if tg_op = 'INSERT' then
    if new.verificado_em is not null or new.verificado_por is not null then
      raise exception 'Um plano novo não pode nascer verificado.' using errcode = '23514';
    end if;
  elsif new.verificado_em is not null and old.verificado_em is null then
    -- Verificar a conclusão: só quem acompanha a loja de fora (não o gerente que executou).
    v_papel := public.rede_papel(new.tenant_id);
    if v_papel is null or v_papel not in ('administrador', 'consultor', 'gerente_regional') then
      raise exception 'Seu perfil não pode verificar a conclusão de planos de ação.' using errcode = '42501';
    end if;
    new.verificado_em := now();
    new.verificado_por := auth.uid();
  elsif old.verificado_em is not null then
    -- Já verificado: os campos da verificação não se editam à mão; mudar o conteúdo exige nova verificação.
    if new.status = 'concluido'
       and new.acao is not distinct from old.acao
       and new.evidencia is not distinct from old.evidencia
       and new.data_conclusao is not distinct from old.data_conclusao then
      new.verificado_em := old.verificado_em;
      new.verificado_por := old.verificado_por;
    else
      new.verificado_em := null;
      new.verificado_por := null;
    end if;
  elsif new.verificado_por is not null then
    new.verificado_por := null;
  end if;
  return new;
end;
$$;
drop trigger if exists rede_pa_validar_trg on public.rede_planos_acao;
create trigger rede_pa_validar_trg before insert or update on public.rede_planos_acao
  for each row execute function public.rede_planos_validar();

/* ------------------------------------------------------------------ desvincular ao excluir o registro de origem */

-- Ao excluir uma visita (ou um checklist de delivery): os planos que ainda não saíram do papel (pendentes e sem ação)
-- somem junto; os que já têm trabalho feito ficam, só perdem o vínculo (o texto da origem continua legível).
create or replace function public.rede_planos_desvincular()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.rede_planos_acao
   where origem_tipo = tg_argv[0] and origem_id = old.id and status = 'pendente'
     and char_length(btrim(coalesce(acao, ''))) = 0 and char_length(btrim(coalesce(evidencia, ''))) = 0;
  update public.rede_planos_acao set origem_id = null where origem_tipo = tg_argv[0] and origem_id = old.id;
  return old;
end;
$$;
revoke all on function public.rede_planos_desvincular() from public, anon, authenticated;

drop trigger if exists rede_qv_desvincular_trg on public.rede_qualidade_visitas;
create trigger rede_qv_desvincular_trg before delete on public.rede_qualidade_visitas
  for each row execute function public.rede_planos_desvincular('qualidade');
drop trigger if exists rede_del_desvincular_trg on public.rede_delivery_registros;
create trigger rede_del_desvincular_trg before delete on public.rede_delivery_registros
  for each row execute function public.rede_planos_desvincular('delivery');

/* ------------------------------------------------------------------ atualização e histórico */

do $$
declare
  t text;
begin
  foreach t in array array['rede_qualidade_visitas', 'rede_planos_acao']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_trg', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_trg', t);
    execute format('drop trigger if exists %I on public.%I', t || '_historico_trg', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.rede_historico_trg()', t || '_historico_trg', t);
  end loop;
end $$;

/* ------------------------------------------------------------------ permissões (RLS) */

alter table public.rede_qualidade_visitas enable row level security;
alter table public.rede_planos_acao enable row level security;

create policy rede_qv_select on public.rede_qualidade_visitas for select to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('qualidade', false)));
create policy rede_qv_insert on public.rede_qualidade_visitas for insert to authenticated
  with check (loja_id in (select public.rede_lojas_permitidas('qualidade', true)));
create policy rede_qv_update on public.rede_qualidade_visitas for update to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('qualidade', true)))
  with check (loja_id in (select public.rede_lojas_permitidas('qualidade', true)));
create policy rede_qv_delete on public.rede_qualidade_visitas for delete to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('qualidade', true)));

create policy rede_pa_select on public.rede_planos_acao for select to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('planos_acao', false)));
create policy rede_pa_insert on public.rede_planos_acao for insert to authenticated
  with check (loja_id in (select public.rede_lojas_permitidas('planos_acao', true)));
create policy rede_pa_update on public.rede_planos_acao for update to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('planos_acao', true)))
  with check (loja_id in (select public.rede_lojas_permitidas('planos_acao', true)));
create policy rede_pa_delete on public.rede_planos_acao for delete to authenticated
  using (loja_id in (select public.rede_lojas_permitidas('planos_acao', true)));

/* ------------------------------------------------------------------ salvar visita + planos (uma transação) */

-- p_respostas: {"<seção>-<item>": {"v": "sim|nao|na", "o": "obs"}} (só itens respondidos ou com observação).
-- p_acoes: {"<seção>-<item>": {"descricao", "rotulo", "acao", "responsavel", "prazo", "prioridade", "status"}} — um por item "Não".
-- Cada item "Não" vira (ou atualiza) um plano de ação; item que deixou de ser "Não" tem o plano removido (se nunca
-- saiu do papel) ou cancelado (se já tinha ação em andamento). Planos concluídos nunca são mexidos.
create or replace function public.rede_qualidade_salvar(
  p_id uuid,
  p_loja uuid,
  p_data date,
  p_avaliador text,
  p_gerente text,
  p_respostas jsonb,
  p_acoes jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_tenant uuid;
  v_id uuid;
  v_resp jsonb := coalesce(p_respostas, '{}'::jsonb);
  v_acoes jsonb := coalesce(p_acoes, '{}'::jsonb);
  v_nao text[];
  k text;
  a jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sua sessão expirou. Entre novamente.' using errcode = '42501';
  end if;
  select tenant_id into v_tenant from public.rede_lojas where id = p_loja;
  if v_tenant is null then
    raise exception 'Loja não encontrada ou sem acesso.' using errcode = '42501';
  end if;
  if jsonb_typeof(v_resp) <> 'object' or jsonb_typeof(v_acoes) <> 'object' then
    raise exception 'Dados da visita inválidos.' using errcode = '23514';
  end if;

  if p_id is null then
    insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, gerente, respostas)
    values (v_tenant, p_loja, p_data, btrim(coalesce(p_avaliador, '')), nullif(btrim(coalesce(p_gerente, '')), ''), v_resp)
    returning id into v_id;
  else
    update public.rede_qualidade_visitas
       set data = p_data, avaliador = btrim(coalesce(p_avaliador, '')), gerente = nullif(btrim(coalesce(p_gerente, '')), ''), respostas = v_resp
     where id = p_id and loja_id = p_loja
     returning id into v_id;
    if v_id is null then
      raise exception 'Visita não encontrada ou sem permissão.' using errcode = '42501';
    end if;
  end if;

  select coalesce(array_agg(e.key order by e.key), '{}'::text[]) into v_nao
    from jsonb_each(v_resp) e where e.value ->> 'v' = 'nao';

  foreach k in array v_nao loop
    a := coalesce(v_acoes -> k, '{}'::jsonb);
    insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_id, origem_ref, origem_rotulo, descricao, acao, responsavel, prazo, prioridade, status)
    values (
      v_tenant, p_loja, 'qualidade', v_id, k,
      coalesce(nullif(btrim(a ->> 'rotulo'), ''), 'Visita de qualidade'),
      coalesce(nullif(btrim(a ->> 'descricao'), ''), 'Item reprovado na visita de qualidade'),
      nullif(btrim(a ->> 'acao'), ''),
      nullif(btrim(a ->> 'responsavel'), ''),
      nullif(a ->> 'prazo', '')::date,
      coalesce(nullif(a ->> 'prioridade', ''), 'media'),
      coalesce(nullif(a ->> 'status', ''), 'pendente')
    )
    on conflict (origem_tipo, origem_id, origem_ref) where origem_id is not null
    do update set
      origem_rotulo = excluded.origem_rotulo,
      acao = excluded.acao,
      responsavel = excluded.responsavel,
      prazo = excluded.prazo,
      prioridade = excluded.prioridade,
      status = excluded.status;
  end loop;

  delete from public.rede_planos_acao
   where origem_tipo = 'qualidade' and origem_id = v_id and not (origem_ref = any (v_nao))
     and status = 'pendente' and char_length(btrim(coalesce(acao, ''))) = 0 and char_length(btrim(coalesce(evidencia, ''))) = 0;
  update public.rede_planos_acao
     set status = 'cancelado',
         observacoes = left(coalesce(observacoes || E'\n', '') || 'Desvio retirado ao corrigir a visita em ' || to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') || '.', 1000)
   where origem_tipo = 'qualidade' and origem_id = v_id and not (origem_ref = any (v_nao)) and status in ('pendente', 'em_andamento');

  return v_id;
end;
$$;
revoke all on function public.rede_qualidade_salvar(uuid, uuid, date, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.rede_qualidade_salvar(uuid, uuid, date, text, text, jsonb, jsonb) to authenticated;
