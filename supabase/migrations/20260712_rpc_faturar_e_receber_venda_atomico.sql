-- Migration: faturar e receber venda de forma atômica (corrigida)
-- Execute manualmente no Supabase SQL Editor
-- Requer:
--   faturar_venda_atomico
--   baixar_conta_receber_atomico
--   assert_tenant_member
--   formas_pagamento, contas_bancarias, contas_receber, vendas
--
-- Correção: a tabela public.vendas no ambiente pode não ter a coluna
-- quantidade_parcelas (migration 20260708_vendas_quantidade_parcelas
-- não aplicada). Garante a coluna antes de recriar a RPC.

alter table public.vendas
  add column if not exists quantidade_parcelas integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vendas_quantidade_parcelas_check'
      and conrelid = 'public.vendas'::regclass
  ) then
    alter table public.vendas
      add constraint vendas_quantidade_parcelas_check
      check (quantidade_parcelas >= 1 and quantidade_parcelas <= 48);
  end if;
end
$$;

comment on column public.vendas.quantidade_parcelas is
  'Número de parcelas geradas em contas a receber ao faturar';

create or replace function public.faturar_e_receber_venda_atomico(
  p_tenant_id uuid,
  p_venda_id uuid,
  p_conta_bancaria_id uuid,
  p_data_recebimento date default current_date,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_venda public.vendas%rowtype;
  v_forma public.formas_pagamento%rowtype;
  v_conta_bancaria public.contas_bancarias%rowtype;
  v_conta_receber_id uuid;
  v_cr_count integer;
  v_movimentacao_id uuid;
  v_parcelas integer;
  v_data_recebimento date;
begin
  perform public.assert_tenant_member(p_tenant_id);

  if p_venda_id is null then
    raise exception 'Informe a venda.';
  end if;

  if p_conta_bancaria_id is null then
    raise exception 'Informe a conta bancária para o recebimento.';
  end if;

  v_data_recebimento := coalesce(p_data_recebimento, current_date);

  select *
  into v_venda
  from public.vendas
  where id = p_venda_id
    and tenant_id = p_tenant_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Venda não encontrada.';
  end if;

  if v_venda.status = 'faturado' then
    raise exception 'Esta venda já está faturada.';
  end if;

  if v_venda.status = 'cancelado' then
    raise exception 'Não é possível faturar uma venda cancelada.';
  end if;

  if v_venda.forma_pagamento_id is null then
    raise exception
      'Informe uma forma de pagamento imediata (dinheiro, PIX ou débito) antes de faturar e receber.';
  end if;

  select *
  into v_forma
  from public.formas_pagamento fp
  where fp.id = v_venda.forma_pagamento_id
    and fp.tenant_id = p_tenant_id
    and fp.deleted_at is null
    and fp.ativo = true
  for update;

  if not found then
    raise exception
      'Forma de pagamento não encontrada ou inativa. Selecione outra forma na venda.';
  end if;

  if v_forma.tipo not in ('dinheiro', 'pix', 'cartao_debito') then
    raise exception
      'Faturar e receber só é permitido para dinheiro, PIX ou cartão de débito.';
  end if;

  if coalesce(v_forma.dias_compensacao, 0) <> 0 then
    raise exception
      'Faturar e receber exige forma de pagamento com dias de compensação igual a zero.';
  end if;

  if not coalesce(v_forma.gera_financeiro, false) then
    raise exception
      'A forma de pagamento selecionada não gera Conta a Receber.';
  end if;

  -- Coluna canônica em public.vendas (não existe alias "parcelas")
  v_parcelas := coalesce(v_venda.quantidade_parcelas, 1);

  if v_parcelas <> 1 then
    raise exception
      'Faturar e receber só é permitido para vendas à vista (1 parcela).';
  end if;

  if v_venda.cliente_id is null then
    raise exception
      'Para gerar contas a receber, a venda precisa de um cliente vinculado.';
  end if;

  if exists (
    select 1
    from public.contas_receber cr
    where cr.tenant_id = p_tenant_id
      and cr.venda_id = p_venda_id
      and cr.deleted_at is null
  ) then
    raise exception
      'Já existem contas a receber vinculadas a esta venda.';
  end if;

  select *
  into v_conta_bancaria
  from public.contas_bancarias
  where id = p_conta_bancaria_id
    and tenant_id = p_tenant_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Conta bancária não encontrada.';
  end if;

  if not v_conta_bancaria.ativo then
    raise exception 'Conta bancária inativa não aceita movimentações.';
  end if;

  -- Fatura (estoque + CR aberto + status faturado) na mesma transação
  perform public.faturar_venda_atomico(
    p_tenant_id,
    p_venda_id,
    p_created_by
  );

  select count(*), min(cr.id)
  into v_cr_count, v_conta_receber_id
  from public.contas_receber cr
  where cr.tenant_id = p_tenant_id
    and cr.venda_id = p_venda_id
    and cr.deleted_at is null;

  if v_cr_count is null or v_cr_count = 0 or v_conta_receber_id is null then
    raise exception
      'Conta a receber não foi gerada no faturamento.';
  end if;

  if v_cr_count <> 1 then
    raise exception
      'Faturar e receber exige exatamente uma Conta a Receber (venda à vista).';
  end if;

  -- Baixa integral + entrada bancária + saldo (mesma transação)
  v_movimentacao_id := public.baixar_conta_receber_atomico(
    p_tenant_id,
    v_conta_receber_id,
    v_data_recebimento,
    p_conta_bancaria_id,
    null, -- valor integral (default na RPC de baixa)
    null,
    null,
    null,
    p_created_by
  );

  if v_movimentacao_id is null then
    raise exception 'Falha ao registrar o recebimento bancário.';
  end if;

  -- Impede estado inconsistente se a baixa não marcar o título
  if exists (
    select 1
    from public.contas_receber cr
    where cr.id = v_conta_receber_id
      and cr.tenant_id = p_tenant_id
      and cr.deleted_at is null
      and cr.status <> 'recebido'
  ) then
    raise exception 'Falha ao concluir o recebimento da Conta a Receber.';
  end if;

  return p_venda_id;
end;
$$;

comment on function public.faturar_e_receber_venda_atomico(
  uuid, uuid, uuid, date, uuid
) is
  'Fatura venda à vista com forma imediata e baixa a CR na mesma transação';

notify pgrst, 'reload schema';
