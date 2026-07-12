-- Migration: Baixas atômicas AP/AR (Sprint 8.4.3)
-- Execute manualmente no Supabase SQL Editor
-- Requer:
--   20260709_rpc_motor_transacional_financeiro.sql
--   20260708_fluxo_caixa_movimentacoes_bancarias.sql

/* ─── Remove stubs/overloads do motor (assinaturas temporárias) ───── */

-- Stub de 20260709_rpc_motor_transacional_financeiro.sql:
--   (p_tenant_id, p_conta_pagar_id, p_conta_bancaria_id, p_valor_pagamento,
--    p_data_pagamento, p_created_by)
drop function if exists public.baixar_conta_pagar_atomico(
  uuid, uuid, uuid, numeric, date, uuid
);

-- Stub de 20260709_rpc_motor_transacional_financeiro.sql:
--   (p_tenant_id, p_conta_receber_id, p_conta_bancaria_id, p_valor_recebido,
--    p_data_recebimento, p_created_by)
drop function if exists public.baixar_conta_receber_atomico(
  uuid, uuid, uuid, numeric, date, uuid
);

/* ─── Baixa atômica — Conta a Pagar ───────────────────────────────── */

create or replace function public.baixar_conta_pagar_atomico(
  p_tenant_id uuid,
  p_conta_pagar_id uuid,
  p_data_pagamento date,
  p_conta_bancaria_id uuid default null,
  p_valor_pagamento numeric(15, 2) default null,
  p_desconto numeric(15, 2) default null,
  p_juros numeric(15, 2) default null,
  p_multa numeric(15, 2) default null,
  p_forma_pagamento_id uuid default null,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_conta_pagar public.contas_pagar%rowtype;
  v_conta_bancaria public.contas_bancarias%rowtype;
  v_conta_bancaria_id uuid;
  v_desconto numeric(15, 2);
  v_juros numeric(15, 2);
  v_multa numeric(15, 2);
  v_valor_liquido numeric(15, 2);
  v_saldo_pendente numeric(15, 2);
  v_valor_pagamento numeric(15, 2);
  v_novo_valor_pago numeric(15, 2);
  v_saldo_restante numeric(15, 2);
  v_novo_status text;
  v_saldo_anterior numeric(15, 2);
  v_saldo_novo numeric(15, 2);
  v_movimentacao_id uuid;
begin
  perform public.assert_tenant_member(p_tenant_id);

  if p_conta_pagar_id is null then
    raise exception 'Informe a conta a pagar.';
  end if;

  select *
  into v_conta_pagar
  from public.contas_pagar
  where id = p_conta_pagar_id
    and tenant_id = p_tenant_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Conta a pagar não encontrada.';
  end if;

  if v_conta_pagar.status = 'pago' then
    raise exception 'Esta conta já foi paga.';
  end if;

  if v_conta_pagar.status = 'cancelado' then
    raise exception 'Esta conta não pode receber baixa no status atual.';
  end if;

  if v_conta_pagar.status not in ('aberto', 'parcial') then
    raise exception 'Esta conta não pode receber baixa no status atual.';
  end if;

  v_desconto := coalesce(p_desconto, v_conta_pagar.desconto, 0);
  v_juros := coalesce(p_juros, v_conta_pagar.juros, 0);
  v_multa := coalesce(p_multa, v_conta_pagar.multa, 0);
  v_valor_liquido :=
    v_conta_pagar.valor_original - v_desconto + v_juros + v_multa;
  v_saldo_pendente := greatest(
    v_valor_liquido - coalesce(v_conta_pagar.valor_pago, 0),
    0
  );
  v_valor_pagamento := coalesce(p_valor_pagamento, v_saldo_pendente);

  if v_valor_pagamento <= 0 then
    raise exception 'Informe um valor de pagamento maior que zero.';
  end if;

  if v_valor_pagamento > v_saldo_pendente + 0.001 then
    raise exception 'Valor de pagamento excede o saldo pendente.';
  end if;

  v_conta_bancaria_id := coalesce(
    p_conta_bancaria_id,
    v_conta_pagar.conta_bancaria_id
  );

  if v_conta_bancaria_id is null then
    raise exception 'Informe a conta bancária para a baixa.';
  end if;

  select *
  into v_conta_bancaria
  from public.contas_bancarias
  where id = v_conta_bancaria_id
    and tenant_id = p_tenant_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Conta bancária não encontrada.';
  end if;

  if not v_conta_bancaria.ativo then
    raise exception 'Conta bancária inativa não aceita movimentações.';
  end if;

  v_saldo_anterior := coalesce(v_conta_bancaria.saldo_atual, 0);
  v_saldo_novo := public.calc_novo_saldo_bancario(
    'saida',
    v_valor_pagamento,
    v_saldo_anterior
  );

  if v_saldo_novo < 0 then
    raise exception 'Saldo insuficiente para esta saída.';
  end if;

  v_novo_valor_pago := coalesce(v_conta_pagar.valor_pago, 0) + v_valor_pagamento;
  v_saldo_restante := v_valor_liquido - v_novo_valor_pago;

  if v_saldo_restante <= 0.001 then
    v_novo_status := 'pago';
  else
    v_novo_status := 'parcial';
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
    created_by
  )
  values (
    p_tenant_id,
    v_conta_bancaria_id,
    'saida',
    v_valor_pagamento,
    v_saldo_anterior,
    v_saldo_novo,
    p_data_pagamento,
    'Baixa CP #' || lpad(v_conta_pagar.numero::text, 6, '0') || ' — ' || v_conta_pagar.descricao,
    'conta_pagar_baixa',
    p_conta_pagar_id,
    p_created_by
  )
  returning id into v_movimentacao_id;

  update public.contas_pagar
  set
    desconto = v_desconto,
    juros = v_juros,
    multa = v_multa,
    valor_pago = v_novo_valor_pago,
    data_pagamento = p_data_pagamento,
    status = v_novo_status,
    forma_pagamento_id = coalesce(
      p_forma_pagamento_id,
      v_conta_pagar.forma_pagamento_id
    ),
    conta_bancaria_id = v_conta_bancaria_id
  where id = p_conta_pagar_id
    and tenant_id = p_tenant_id
    and deleted_at is null;

  update public.contas_bancarias
  set saldo_atual = v_saldo_novo
  where id = v_conta_bancaria_id
    and tenant_id = p_tenant_id
    and deleted_at is null;

  return v_movimentacao_id;
end;
$$;

comment on function public.baixar_conta_pagar_atomico(
  uuid, uuid, date, uuid, numeric, numeric, numeric, numeric, uuid, uuid
) is
  'Baixa atômica de conta a pagar com saída bancária e atualização de saldo_atual';

/* ─── Baixa atômica — Conta a Receber ────────────────────────────── */

create or replace function public.baixar_conta_receber_atomico(
  p_tenant_id uuid,
  p_conta_receber_id uuid,
  p_data_recebimento date,
  p_conta_bancaria_id uuid default null,
  p_valor_recebido numeric(15, 2) default null,
  p_desconto numeric(15, 2) default null,
  p_juros numeric(15, 2) default null,
  p_multa numeric(15, 2) default null,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_conta_receber public.contas_receber%rowtype;
  v_conta_bancaria public.contas_bancarias%rowtype;
  v_conta_bancaria_id uuid;
  v_desconto numeric(15, 2);
  v_juros numeric(15, 2);
  v_multa numeric(15, 2);
  v_valor_liquido numeric(15, 2);
  v_valor_recebido numeric(15, 2);
  v_saldo_anterior numeric(15, 2);
  v_saldo_novo numeric(15, 2);
  v_movimentacao_id uuid;
begin
  perform public.assert_tenant_member(p_tenant_id);

  if p_conta_receber_id is null then
    raise exception 'Informe a conta a receber.';
  end if;

  select *
  into v_conta_receber
  from public.contas_receber
  where id = p_conta_receber_id
    and tenant_id = p_tenant_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Conta a receber não encontrada.';
  end if;

  if v_conta_receber.status = 'recebido' then
    raise exception 'Esta conta já foi recebida.';
  end if;

  if v_conta_receber.status = 'cancelado' then
    raise exception 'Esta conta não pode receber baixa no status atual.';
  end if;

  if v_conta_receber.status <> 'aberto' then
    raise exception 'Esta conta não pode receber baixa no status atual.';
  end if;

  v_desconto := coalesce(p_desconto, v_conta_receber.desconto, 0);
  v_juros := coalesce(p_juros, v_conta_receber.juros, 0);
  v_multa := coalesce(p_multa, v_conta_receber.multa, 0);
  v_valor_liquido :=
    v_conta_receber.valor_original - v_desconto + v_juros + v_multa;
  v_valor_recebido := coalesce(p_valor_recebido, v_valor_liquido);

  if v_valor_recebido <= 0 then
    raise exception 'Informe um valor recebido maior que zero.';
  end if;

  -- Sprint atual: somente quitação integral (sem recebimento parcial)
  if abs(v_valor_recebido - v_valor_liquido) > 0.001 then
    raise exception
      'Recebimento parcial não é permitido. Informe o valor líquido integral do título.';
  end if;

  v_conta_bancaria_id := coalesce(
    p_conta_bancaria_id,
    v_conta_receber.conta_bancaria_id
  );

  if v_conta_bancaria_id is null then
    raise exception 'Informe a conta bancária para a baixa.';
  end if;

  select *
  into v_conta_bancaria
  from public.contas_bancarias
  where id = v_conta_bancaria_id
    and tenant_id = p_tenant_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Conta bancária não encontrada.';
  end if;

  if not v_conta_bancaria.ativo then
    raise exception 'Conta bancária inativa não aceita movimentações.';
  end if;

  v_saldo_anterior := coalesce(v_conta_bancaria.saldo_atual, 0);
  v_saldo_novo := public.calc_novo_saldo_bancario(
    'entrada',
    v_valor_recebido,
    v_saldo_anterior
  );

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
    conta_receber_id,
    created_by
  )
  values (
    p_tenant_id,
    v_conta_bancaria_id,
    'entrada',
    v_valor_recebido,
    v_saldo_anterior,
    v_saldo_novo,
    p_data_recebimento,
    'Baixa CR #' || lpad(v_conta_receber.numero::text, 6, '0') || ' — ' || v_conta_receber.descricao,
    'conta_receber_baixa',
    p_conta_receber_id,
    p_created_by
  )
  returning id into v_movimentacao_id;

  update public.contas_receber
  set
    desconto = v_desconto,
    juros = v_juros,
    multa = v_multa,
    valor_recebido = v_valor_recebido,
    data_recebimento = p_data_recebimento,
    status = 'recebido',
    conta_bancaria_id = v_conta_bancaria_id
  where id = p_conta_receber_id
    and tenant_id = p_tenant_id
    and deleted_at is null;

  update public.contas_bancarias
  set saldo_atual = v_saldo_novo
  where id = v_conta_bancaria_id
    and tenant_id = p_tenant_id
    and deleted_at is null;

  return v_movimentacao_id;
end;
$$;

comment on function public.baixar_conta_receber_atomico(
  uuid, uuid, date, uuid, numeric, numeric, numeric, numeric, uuid
) is
  'Baixa atômica de conta a receber com entrada bancária e atualização de saldo_atual';
