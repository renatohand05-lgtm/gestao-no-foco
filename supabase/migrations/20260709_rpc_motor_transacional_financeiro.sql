-- Migration: Motor Transacional Financeiro (Sprint 8.4.3)
-- Execute manualmente no Supabase SQL Editor
-- Requer:
--   20260708_fluxo_caixa_contas_bancarias.sql
--   20260708_fluxo_caixa_movimentacoes_bancarias.sql
--   20260708_rpc_faturar_cancelar_venda.sql (assert_tenant_member)
--   contas_pagar, contas_receber

/* ─── Helpers internos ─────────────────────────────────────────────── */

create or replace function public.calc_novo_saldo_bancario(
  p_tipo text,
  p_valor numeric(15, 2),
  p_saldo_anterior numeric(15, 2),
  p_transferencia_papel text default null
)
returns numeric(15, 2)
language plpgsql
immutable
set search_path = public
as $$
begin
  case p_tipo
    when 'entrada' then
      return p_saldo_anterior + p_valor;
    when 'saida' then
      return p_saldo_anterior - p_valor;
    when 'ajuste' then
      return p_valor;
    when 'transferencia' then
      if p_transferencia_papel = 'recebida' then
        return p_saldo_anterior + p_valor;
      end if;
      return p_saldo_anterior - p_valor;
    else
      return p_saldo_anterior;
  end case;
end;
$$;

comment on function public.calc_novo_saldo_bancario(text, numeric, numeric, text) is
  'Calcula saldo_novo após movimentação — uso interno do motor transacional';

/* ─── 1. Registrar movimentação bancária atômica ───────────────────── */

create or replace function public.registrar_movimentacao_bancaria_atomico(
  p_tenant_id uuid,
  p_conta_bancaria_id uuid,
  p_tipo text,
  p_valor numeric(15, 2),
  p_data_movimentacao date,
  p_descricao text,
  p_origem text default 'manual',
  p_conta_pagar_id uuid default null,
  p_conta_receber_id uuid default null,
  p_observacoes text default null,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_conta public.contas_bancarias%rowtype;
  v_saldo_anterior numeric(15, 2);
  v_saldo_novo numeric(15, 2);
  v_movimentacao_id uuid;
begin
  perform public.assert_tenant_member(p_tenant_id);

  if p_tipo not in ('entrada', 'saida', 'ajuste') then
    raise exception 'Tipo de movimentação inválido para registro direto.';
  end if;

  if p_origem not in (
    'manual',
    'ajuste',
    'conta_pagar_baixa',
    'conta_receber_baixa'
  ) then
    raise exception 'Origem de movimentação inválida.';
  end if;

  if p_tipo <> 'ajuste' and p_valor <= 0 then
    raise exception 'Informe um valor maior que zero.';
  end if;

  if p_tipo = 'ajuste' and p_valor < 0 then
    raise exception 'Informe um saldo de ajuste válido.';
  end if;

  if p_origem = 'conta_pagar_baixa' then
    if p_conta_pagar_id is null then
      raise exception 'Informe a conta a pagar vinculada à baixa.';
    end if;

    if not exists (
      select 1
      from public.contas_pagar cp
      where cp.id = p_conta_pagar_id
        and cp.tenant_id = p_tenant_id
        and cp.deleted_at is null
    ) then
      raise exception 'Conta a pagar não encontrada.';
    end if;
  elsif p_origem = 'conta_receber_baixa' then
    if p_conta_receber_id is null then
      raise exception 'Informe a conta a receber vinculada à baixa.';
    end if;

    if not exists (
      select 1
      from public.contas_receber cr
      where cr.id = p_conta_receber_id
        and cr.tenant_id = p_tenant_id
        and cr.deleted_at is null
    ) then
      raise exception 'Conta a receber não encontrada.';
    end if;
  end if;

  if p_conta_pagar_id is not null and p_origem <> 'conta_pagar_baixa' then
    raise exception 'conta_pagar_id só é permitido com origem conta_pagar_baixa.';
  end if;

  if p_conta_receber_id is not null and p_origem <> 'conta_receber_baixa' then
    raise exception 'conta_receber_id só é permitido com origem conta_receber_baixa.';
  end if;

  select *
  into v_conta
  from public.contas_bancarias
  where id = p_conta_bancaria_id
    and tenant_id = p_tenant_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Conta bancária não encontrada.';
  end if;

  if not v_conta.ativo then
    raise exception 'Conta bancária inativa não aceita movimentações.';
  end if;

  v_saldo_anterior := coalesce(v_conta.saldo_atual, 0);
  v_saldo_novo := public.calc_novo_saldo_bancario(
    p_tipo,
    p_valor,
    v_saldo_anterior
  );

  if p_tipo = 'saida' and v_saldo_novo < 0 then
    raise exception 'Saldo insuficiente para esta saída.';
  end if;

  insert into public.movimentacoes_bancarias (
    tenant_id,
    conta_bancaria_id,
    tipo,
    valor,
    saldo_anterior,
    saldo_novo,
    data_movimentacao,
    descricao,
    origem,
    conta_pagar_id,
    conta_receber_id,
    observacoes,
    created_by
  )
  values (
    p_tenant_id,
    p_conta_bancaria_id,
    p_tipo,
    p_valor,
    v_saldo_anterior,
    v_saldo_novo,
    p_data_movimentacao,
    trim(p_descricao),
    p_origem,
    p_conta_pagar_id,
    p_conta_receber_id,
    p_observacoes,
    p_created_by
  )
  returning id into v_movimentacao_id;

  update public.contas_bancarias
  set saldo_atual = v_saldo_novo
  where id = p_conta_bancaria_id
    and tenant_id = p_tenant_id
    and deleted_at is null;

  return v_movimentacao_id;
end;
$$;

comment on function public.registrar_movimentacao_bancaria_atomico(uuid, uuid, text, numeric, date, text, text, uuid, uuid, text, uuid) is
  'Registra entrada/saída/ajuste bancário com lock FOR UPDATE e atualização atômica de saldo_atual';

/* ─── 2. Transferência entre contas atômica ────────────────────────── */

create or replace function public.transferir_entre_contas_atomico(
  p_tenant_id uuid,
  p_conta_origem_id uuid,
  p_conta_destino_id uuid,
  p_valor numeric(15, 2),
  p_data_movimentacao date,
  p_descricao text,
  p_observacoes text default null,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_origem public.contas_bancarias%rowtype;
  v_destino public.contas_bancarias%rowtype;
  v_saldo_origem_anterior numeric(15, 2);
  v_saldo_destino_anterior numeric(15, 2);
  v_saldo_origem_novo numeric(15, 2);
  v_saldo_destino_novo numeric(15, 2);
  v_grupo_id uuid := gen_random_uuid();
  v_enviada_id uuid;
  v_recebida_id uuid;
  v_primeiro_id uuid;
  v_segundo_id uuid;
begin
  perform public.assert_tenant_member(p_tenant_id);

  if p_conta_origem_id = p_conta_destino_id then
    raise exception 'Selecione contas diferentes para a transferência.';
  end if;

  if p_valor <= 0 then
    raise exception 'Informe um valor maior que zero.';
  end if;

  -- Lock ordenado por UUID para evitar deadlock entre transferências concorrentes
  if p_conta_origem_id < p_conta_destino_id then
    v_primeiro_id := p_conta_origem_id;
    v_segundo_id := p_conta_destino_id;
  else
    v_primeiro_id := p_conta_destino_id;
    v_segundo_id := p_conta_origem_id;
  end if;

  perform 1
  from public.contas_bancarias
  where id = v_primeiro_id
    and tenant_id = p_tenant_id
    and deleted_at is null
  for update;

  perform 1
  from public.contas_bancarias
  where id = v_segundo_id
    and tenant_id = p_tenant_id
    and deleted_at is null
  for update;

  select *
  into v_origem
  from public.contas_bancarias
  where id = p_conta_origem_id
    and tenant_id = p_tenant_id
    and deleted_at is null;

  if not found then
    raise exception 'Conta bancária de origem não encontrada.';
  end if;

  if not v_origem.ativo then
    raise exception 'Conta bancária de origem inativa não aceita movimentações.';
  end if;

  select *
  into v_destino
  from public.contas_bancarias
  where id = p_conta_destino_id
    and tenant_id = p_tenant_id
    and deleted_at is null;

  if not found then
    raise exception 'Conta bancária de destino não encontrada.';
  end if;

  if not v_destino.ativo then
    raise exception 'Conta bancária de destino inativa não aceita movimentações.';
  end if;

  v_saldo_origem_anterior := coalesce(v_origem.saldo_atual, 0);
  v_saldo_destino_anterior := coalesce(v_destino.saldo_atual, 0);

  if p_valor > v_saldo_origem_anterior then
    raise exception 'Saldo insuficiente na conta de origem.';
  end if;

  v_saldo_origem_novo := v_saldo_origem_anterior - p_valor;
  v_saldo_destino_novo := v_saldo_destino_anterior + p_valor;

  insert into public.movimentacoes_bancarias (
    tenant_id,
    conta_bancaria_id,
    conta_bancaria_contrapartida_id,
    grupo_transferencia_id,
    tipo,
    transferencia_papel,
    valor,
    saldo_anterior,
    saldo_novo,
    data_movimentacao,
    descricao,
    origem,
    observacoes,
    created_by
  )
  values (
    p_tenant_id,
    p_conta_origem_id,
    p_conta_destino_id,
    v_grupo_id,
    'transferencia',
    'enviada',
    p_valor,
    v_saldo_origem_anterior,
    v_saldo_origem_novo,
    p_data_movimentacao,
    trim(p_descricao),
    'transferencia',
    p_observacoes,
    p_created_by
  )
  returning id into v_enviada_id;

  insert into public.movimentacoes_bancarias (
    tenant_id,
    conta_bancaria_id,
    conta_bancaria_contrapartida_id,
    grupo_transferencia_id,
    tipo,
    transferencia_papel,
    valor,
    saldo_anterior,
    saldo_novo,
    data_movimentacao,
    descricao,
    origem,
    observacoes,
    created_by
  )
  values (
    p_tenant_id,
    p_conta_destino_id,
    p_conta_origem_id,
    v_grupo_id,
    'transferencia',
    'recebida',
    p_valor,
    v_saldo_destino_anterior,
    v_saldo_destino_novo,
    p_data_movimentacao,
    trim(p_descricao),
    'transferencia',
    p_observacoes,
    p_created_by
  )
  returning id into v_recebida_id;

  update public.contas_bancarias
  set saldo_atual = v_saldo_origem_novo
  where id = p_conta_origem_id
    and tenant_id = p_tenant_id
    and deleted_at is null;

  update public.contas_bancarias
  set saldo_atual = v_saldo_destino_novo
  where id = p_conta_destino_id
    and tenant_id = p_tenant_id
    and deleted_at is null;

  return jsonb_build_object(
    'enviada_id', v_enviada_id,
    'recebida_id', v_recebida_id,
    'grupo_transferencia_id', v_grupo_id
  );
end;
$$;

comment on function public.transferir_entre_contas_atomico(uuid, uuid, uuid, numeric, date, text, text, uuid) is
  'Transfere valor entre contas com duas pernas de movimentação e saldos atualizados atomicamente';

/* ─── 3. Estorno de movimentação atômico ───────────────────────────── */

create or replace function public.estornar_movimentacao_bancaria_atomico(
  p_tenant_id uuid,
  p_movimentacao_id uuid,
  p_data_movimentacao date,
  p_observacoes text default null,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_original public.movimentacoes_bancarias%rowtype;
  v_conta public.contas_bancarias%rowtype;
  v_saldo_anterior numeric(15, 2);
  v_delta numeric(15, 2);
  v_saldo_novo numeric(15, 2);
  v_valor numeric(15, 2);
  v_estorno_id uuid;
begin
  perform public.assert_tenant_member(p_tenant_id);

  select *
  into v_original
  from public.movimentacoes_bancarias
  where id = p_movimentacao_id
    and tenant_id = p_tenant_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Movimentação não encontrada.';
  end if;

  if v_original.estornada_por_id is not null then
    raise exception 'Esta movimentação já foi estornada.';
  end if;

  if v_original.tipo = 'estorno' then
    raise exception 'Esta movimentação não pode ser estornada.';
  end if;

  select *
  into v_conta
  from public.contas_bancarias
  where id = v_original.conta_bancaria_id
    and tenant_id = p_tenant_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Conta bancária não encontrada.';
  end if;

  if not v_conta.ativo then
    raise exception 'Conta bancária inativa não aceita movimentações.';
  end if;

  v_saldo_anterior := coalesce(v_conta.saldo_atual, 0);
  v_delta := v_original.saldo_novo - v_original.saldo_anterior;
  v_saldo_novo := v_saldo_anterior - v_delta;
  v_valor := abs(v_delta);

  if v_saldo_novo < 0 then
    raise exception 'Estorno resultaria em saldo negativo na conta.';
  end if;

  insert into public.movimentacoes_bancarias (
    tenant_id,
    conta_bancaria_id,
    tipo,
    valor,
    saldo_anterior,
    saldo_novo,
    data_movimentacao,
    descricao,
    origem,
    movimentacao_estornada_id,
    observacoes,
    created_by
  )
  values (
    p_tenant_id,
    v_original.conta_bancaria_id,
    'estorno',
    v_valor,
    v_saldo_anterior,
    v_saldo_novo,
    p_data_movimentacao,
    'Estorno: ' || v_original.descricao,
    'estorno',
    v_original.id,
    p_observacoes,
    p_created_by
  )
  returning id into v_estorno_id;

  update public.movimentacoes_bancarias
  set estornada_por_id = v_estorno_id
  where id = v_original.id
    and tenant_id = p_tenant_id
    and deleted_at is null;

  update public.contas_bancarias
  set saldo_atual = v_saldo_novo
  where id = v_original.conta_bancaria_id
    and tenant_id = p_tenant_id
    and deleted_at is null;

  return v_estorno_id;
exception
  when unique_violation then
    raise exception 'Esta movimentação já foi estornada.';
end;
$$;

comment on function public.estornar_movimentacao_bancaria_atomico(uuid, uuid, date, text, uuid) is
  'Estorna movimentação bancária com lock FOR UPDATE, impedindo estorno duplicado';

/* ─── 4. Baixas AP/AR — contrato preparado (Sprint 8.4.4) ──────────── */

create or replace function public.baixar_conta_pagar_atomico(
  p_tenant_id uuid,
  p_conta_pagar_id uuid,
  p_conta_bancaria_id uuid,
  p_valor_pagamento numeric(15, 2),
  p_data_pagamento date,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.assert_tenant_member(p_tenant_id);

  if p_conta_pagar_id is null then
    raise exception 'Informe a conta a pagar.';
  end if;

  if p_conta_bancaria_id is null then
    raise exception 'Informe a conta bancária para a baixa.';
  end if;

  if p_valor_pagamento is null or p_valor_pagamento <= 0 then
    raise exception 'Informe um valor de pagamento maior que zero.';
  end if;

  raise exception
    'Integração de baixa a pagar pendente (Sprint 8.4.4). Use registrar_movimentacao_bancaria_atomico com origem manual até lá.';
end;
$$;

comment on function public.baixar_conta_pagar_atomico(uuid, uuid, uuid, numeric, date, uuid) is
  'Contrato preparado: baixa atômica de conta a pagar + saída bancária (Sprint 8.4.4)';

create or replace function public.baixar_conta_receber_atomico(
  p_tenant_id uuid,
  p_conta_receber_id uuid,
  p_conta_bancaria_id uuid,
  p_valor_recebido numeric(15, 2),
  p_data_recebimento date,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.assert_tenant_member(p_tenant_id);

  if p_conta_receber_id is null then
    raise exception 'Informe a conta a receber.';
  end if;

  if p_conta_bancaria_id is null then
    raise exception 'Informe a conta bancária para a baixa.';
  end if;

  if p_valor_recebido is null or p_valor_recebido <= 0 then
    raise exception 'Informe um valor recebido maior que zero.';
  end if;

  raise exception
    'Integração de baixa a receber pendente (Sprint 8.4.4). Use registrar_movimentacao_bancaria_atomico com origem manual até lá.';
end;
$$;

comment on function public.baixar_conta_receber_atomico(uuid, uuid, uuid, numeric, date, uuid) is
  'Contrato preparado: baixa atômica de conta a receber + entrada bancária (Sprint 8.4.4)';
