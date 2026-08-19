-- Hotfix: PostgreSQL format() only accepts %s / %I / %L.
-- sprintf-style float placeholders in format() made os_atribuir_mecanico_atomico fail.

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
    concat(
      'Mecânico ',
      v_mec.nome_completo,
      ' atribuído como ',
      p_papel,
      ' (',
      trim(to_char(round(p_percentual), '999')),
      '%)'
    ),
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
