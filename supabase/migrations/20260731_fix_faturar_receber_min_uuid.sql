-- Sprint 14 correção — faturar_e_receber_venda_atomico
-- Erro: function min(uuid) does not exist
-- Causa: agregação inválida sobre UUID de contas_receber.id
-- Correção: count separado + ORDER BY created_at LIMIT 1

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

  perform public.faturar_venda_atomico(
    p_tenant_id,
    p_venda_id,
    p_created_by
  );

  -- Correção: nunca agregar UUID. Contagem + seleção determinística.
  select count(*)
  into v_cr_count
  from public.contas_receber cr
  where cr.tenant_id = p_tenant_id
    and cr.venda_id = p_venda_id
    and cr.deleted_at is null;

  select cr.id
  into v_conta_receber_id
  from public.contas_receber cr
  where cr.tenant_id = p_tenant_id
    and cr.venda_id = p_venda_id
    and cr.deleted_at is null
  order by cr.created_at asc, cr.numero asc, cr.id asc
  limit 1;

  if v_cr_count is null or v_cr_count = 0 or v_conta_receber_id is null then
    raise exception
      'Conta a receber não foi gerada no faturamento.';
  end if;

  if v_cr_count <> 1 then
    raise exception
      'Faturar e receber exige exatamente uma Conta a Receber (venda à vista).';
  end if;

  v_movimentacao_id := public.baixar_conta_receber_atomico(
    p_tenant_id,
    v_conta_receber_id,
    v_data_recebimento,
    p_conta_bancaria_id,
    null,
    null,
    null,
    null,
    p_created_by
  );

  if v_movimentacao_id is null then
    raise exception 'Falha ao registrar o recebimento bancário.';
  end if;

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
  'Fatura venda à vista e baixa CR — CR escolhida por created_at/numero (sem agregação de UUID)';

notify pgrst, 'reload schema';

-- Permissão dashboard vendas (idempotente)
insert into public.tenant_role_permissions (tenant_id, role, permission_key, allowed)
select t.id, r.role, 'vendas.visualizar_dashboard', true
from public.tenants t
cross join (values ('owner'), ('admin'), ('manager'), ('member')) as r(role)
on conflict (tenant_id, role, permission_key) do nothing;
