-- Fix vigência × competência (sobreposição de períodos)
-- Idempotente. Substitui gerar_obrigacao_mecanico_atomico sem alterar assinatura.
-- Regra: vigencia_inicio <= último dia do mês
--        AND (vigencia_fim IS NULL OR vigencia_fim >= primeiro dia do mês)
-- Valor: mensal integral (proporcionalidade = pendência futura).
-- Também impede vigências conflitantes via trigger.

/* ─── Helper: sobreposição vigência × competência ─────────── */

create or replace function public.fn_mecanico_custo_sobrepoe_competencia(
  p_vigencia_inicio date,
  p_vigencia_fim date,
  p_competencia date
)
returns boolean
language sql
immutable
as $$
  select
    p_vigencia_inicio <= (date_trunc('month', p_competencia) + interval '1 month - 1 day')::date
    and (
      p_vigencia_fim is null
      or p_vigencia_fim >= date_trunc('month', p_competencia)::date
    );
$$;

comment on function public.fn_mecanico_custo_sobrepoe_competencia(date, date, date) is
  'True quando a vigência se sobrepõe ao mês da competência. Valor integral (sem proporcionalidade).';

/* ─── Trigger: impedir vigências conflitantes ─────────────── */

create or replace function public.trg_mecanico_custos_sem_conflito()
returns trigger
language plpgsql
as $$
declare
  v_conflito uuid;
begin
  if new.deleted_at is not null then
    return new;
  end if;

  select c.id into v_conflito
  from public.mecanico_custos c
  where c.tenant_id = new.tenant_id
    and c.mecanico_id = new.mecanico_id
    and c.deleted_at is null
    and c.id is distinct from new.id
    and c.vigencia_inicio <= coalesce(new.vigencia_fim, '9999-12-31'::date)
    and new.vigencia_inicio <= coalesce(c.vigencia_fim, '9999-12-31'::date)
  limit 1;

  if v_conflito is not null then
    raise exception 'Já existe vigência conflitante para este mecânico no período.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_mecanico_custos_sem_conflito on public.mecanico_custos;
create trigger trg_mecanico_custos_sem_conflito
  before insert or update of vigencia_inicio, vigencia_fim, deleted_at
  on public.mecanico_custos
  for each row execute function public.trg_mecanico_custos_sem_conflito();

/* ─── RPC corrigida (mesma assinatura) ────────────────────── */

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
  v_comp_fim date;
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
  v_comp_fim := (date_trunc('month', p_competencia) + interval '1 month - 1 day')::date;

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

  -- Regra de sobreposição (igual à UI / lib/mecanicos/vigencia.ts)
  select * into v_custo
  from public.mecanico_custos
  where tenant_id = p_tenant_id
    and mecanico_id = p_mecanico_id
    and deleted_at is null
    and public.fn_mecanico_custo_sobrepoe_competencia(
      vigencia_inicio, vigencia_fim, v_competencia
    )
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
  v_last_day := extract(day from v_comp_fim)::integer;
  v_vencimento := coalesce(
    p_data_vencimento,
    make_date(
      extract(year from v_competencia)::integer,
      extract(month from v_competencia)::integer,
      least(v_dia, v_last_day)
    )
  );

  -- Valor mensal integral (sem proporcionalidade nesta versão)
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
      'tipo', p_tipo_obrigacao,
      'regra', 'sobreposicao_valor_integral'
    ),
    p_observacoes
  );

  return v_comp_id;
end;
$$;

grant execute on function public.gerar_obrigacao_mecanico_atomico(uuid, uuid, date, text, date, text) to authenticated;
grant execute on function public.fn_mecanico_custo_sobrepoe_competencia(date, date, date) to authenticated;

notify pgrst, 'reload schema';
