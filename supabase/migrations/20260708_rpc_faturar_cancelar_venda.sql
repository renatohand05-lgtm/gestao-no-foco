-- Migration: faturamento e cancelamento atômicos de venda
-- Execute manualmente no Supabase SQL Editor
-- Requer:
--   vendas, venda_itens, produtos, estoque_movimentacoes
--   formas_pagamento, contas_receber
--   20260708_vendas_quantidade_parcelas.sql (coluna quantidade_parcelas)

create or replace function public.assert_tenant_member(p_tenant_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
  ) then
    raise exception 'Acesso negado ao tenant.';
  end if;
end;
$$;

create or replace function public.faturar_venda_atomico(
  p_tenant_id uuid,
  p_venda_id uuid,
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
  v_item record;
  v_estoque numeric;
  v_estoque_novo numeric;
  v_referencia text;
  v_parcelas integer;
  v_grupo uuid;
  v_total_cents bigint;
  v_base_cents bigint;
  v_remainder bigint;
  v_valor_parcela numeric(15, 2);
  v_vencimento date;
  v_parcela integer;
  v_descricao text;
  v_has_forma boolean := false;
begin
  perform public.assert_tenant_member(p_tenant_id);

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

  if not exists (
    select 1
    from public.venda_itens vi
    where vi.venda_id = p_venda_id
      and vi.tenant_id = p_tenant_id
      and vi.deleted_at is null
  ) then
    raise exception 'A venda precisa ter pelo menos um item para ser faturada.';
  end if;

  if v_venda.forma_pagamento_id is null then
    raise exception
      'Selecione uma forma de pagamento antes de faturar a venda. Edite a venda e informe a forma de pagamento.';
  end if;

  select *
  into v_forma
  from public.formas_pagamento fp
  where fp.id = v_venda.forma_pagamento_id
    and fp.tenant_id = p_tenant_id
    and fp.deleted_at is null
    and fp.ativo = true;

  if not found then
    raise exception
      'Forma de pagamento não encontrada ou inativa. Selecione outra forma na venda.';
  end if;

  v_has_forma := true;

  v_referencia := format(
    'Venda #%s (ID: %s)',
    lpad(v_venda.numero::text, 6, '0'),
    v_venda.id
  );

  for v_item in
    select
      vi.produto_id,
      min(vi.descricao) as descricao,
      sum(vi.quantidade) as quantidade_total,
      p.estoque_atual,
      p.tipo
    from public.venda_itens vi
    join public.produtos p
      on p.id = vi.produto_id
     and p.tenant_id = p_tenant_id
     and p.deleted_at is null
    where vi.venda_id = p_venda_id
      and vi.tenant_id = p_tenant_id
      and vi.deleted_at is null
      and vi.produto_id is not null
      and vi.tipo_item <> 'servico'
    group by vi.produto_id, p.estoque_atual, p.tipo
  loop
    if v_item.quantidade_total > v_item.estoque_atual then
      raise exception
        'Estoque insuficiente para "%". Disponível: %.',
        v_item.descricao,
        v_item.estoque_atual;
    end if;

    v_estoque := coalesce(v_item.estoque_atual, 0);
    v_estoque_novo := v_estoque - v_item.quantidade_total;

    insert into public.estoque_movimentacoes (
      tenant_id,
      produto_id,
      tipo,
      quantidade,
      quantidade_anterior,
      quantidade_nova,
      motivo,
      origem,
      observacoes,
      created_by
    ) values (
      p_tenant_id,
      v_item.produto_id,
      'saida',
      v_item.quantidade_total,
      v_estoque,
      v_estoque_novo,
      format('Faturamento da venda %s', v_referencia),
      'venda',
      v_referencia,
      p_created_by
    );

    update public.produtos
    set estoque_atual = v_estoque_novo
    where id = v_item.produto_id
      and tenant_id = p_tenant_id
      and deleted_at is null;
  end loop;

  if v_has_forma and v_forma.gera_financeiro then
    if exists (
      select 1
      from public.contas_receber cr
      where cr.tenant_id = p_tenant_id
        and cr.venda_id = p_venda_id
        and cr.deleted_at is null
    ) then
      raise exception 'Já existem contas a receber vinculadas a esta venda.';
    end if;

    v_parcelas := coalesce(v_venda.quantidade_parcelas, 1);

    if v_parcelas < 1 or v_parcelas > 48 then
      raise exception 'Quantidade de parcelas inválida na venda.';
    end if;

    v_grupo := case when v_parcelas > 1 then gen_random_uuid() else null end;
    v_total_cents := round(v_venda.total * 100)::bigint;
    v_base_cents := v_total_cents / v_parcelas;
    v_remainder := v_total_cents - (v_base_cents * v_parcelas);
    v_descricao := format('Venda #%s', lpad(v_venda.numero::text, 6, '0'));

    for v_parcela in 1..v_parcelas loop
      if v_parcela = v_parcelas then
        v_valor_parcela := (v_base_cents + v_remainder) / 100.0;
      else
        v_valor_parcela := v_base_cents / 100.0;
      end if;

      v_vencimento := (
        v_venda.data_venda
        + coalesce(v_forma.dias_compensacao, 0)
        + ((v_parcela - 1) || ' months')::interval
      )::date;

      insert into public.contas_receber (
        tenant_id,
        cliente_id,
        venda_id,
        forma_pagamento_id,
        descricao,
        grupo_parcelamento_id,
        parcela_numero,
        parcela_total,
        status,
        valor_original,
        desconto,
        juros,
        multa,
        valor_recebido,
        data_emissao,
        data_vencimento
      ) values (
        p_tenant_id,
        v_venda.cliente_id,
        p_venda_id,
        v_venda.forma_pagamento_id,
        v_descricao,
        v_grupo,
        v_parcela,
        v_parcelas,
        'aberto',
        v_valor_parcela,
        0,
        0,
        0,
        0,
        v_venda.data_venda,
        v_vencimento
      );
    end loop;
  end if;

  update public.vendas
  set status = 'faturado'
  where id = p_venda_id
    and tenant_id = p_tenant_id
    and deleted_at is null;

  return p_venda_id;
end;
$$;

create or replace function public.cancelar_venda_atomico(
  p_tenant_id uuid,
  p_venda_id uuid,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_venda public.vendas%rowtype;
  v_item record;
  v_estoque numeric;
  v_estoque_novo numeric;
  v_referencia text;
begin
  perform public.assert_tenant_member(p_tenant_id);

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

  if v_venda.status = 'cancelado' then
    raise exception 'Esta venda já está cancelada.';
  end if;

  if v_venda.status = 'faturado' then
    if exists (
      select 1
      from public.contas_receber cr
      where cr.tenant_id = p_tenant_id
        and cr.venda_id = p_venda_id
        and cr.deleted_at is null
        and cr.status = 'recebido'
    ) then
      raise exception
        'Não é possível cancelar: existem títulos já recebidos vinculados a esta venda.';
    end if;

    v_referencia := format(
      'Venda #%s (ID: %s)',
      lpad(v_venda.numero::text, 6, '0'),
      v_venda.id
    );

    for v_item in
      select
        vi.produto_id,
        min(vi.descricao) as descricao,
        sum(vi.quantidade) as quantidade_total,
        p.estoque_atual,
        p.tipo
      from public.venda_itens vi
      join public.produtos p
        on p.id = vi.produto_id
       and p.tenant_id = p_tenant_id
       and p.deleted_at is null
      where vi.venda_id = p_venda_id
        and vi.tenant_id = p_tenant_id
        and vi.deleted_at is null
        and vi.produto_id is not null
        and vi.tipo_item <> 'servico'
      group by vi.produto_id, p.estoque_atual, p.tipo
    loop
      v_estoque := coalesce(v_item.estoque_atual, 0);
      v_estoque_novo := v_estoque + v_item.quantidade_total;

      insert into public.estoque_movimentacoes (
        tenant_id,
        produto_id,
        tipo,
        quantidade,
        quantidade_anterior,
        quantidade_nova,
        motivo,
        origem,
        observacoes,
        created_by
      ) values (
        p_tenant_id,
        v_item.produto_id,
        'entrada',
        v_item.quantidade_total,
        v_estoque,
        v_estoque_novo,
        format('Cancelamento da venda %s', v_referencia),
        'devolucao',
        v_referencia,
        p_created_by
      );

      update public.produtos
      set estoque_atual = v_estoque_novo
      where id = v_item.produto_id
        and tenant_id = p_tenant_id
        and deleted_at is null;
    end loop;

    update public.contas_receber
    set
      status = 'cancelado',
      updated_at = now()
    where tenant_id = p_tenant_id
      and venda_id = p_venda_id
      and deleted_at is null
      and status not in ('cancelado', 'recebido');
  end if;

  update public.vendas
  set status = 'cancelado'
  where id = p_venda_id
    and tenant_id = p_tenant_id
    and deleted_at is null;

  return p_venda_id;
end;
$$;

comment on function public.faturar_venda_atomico(uuid, uuid, uuid) is
  'Fatura venda com baixa de estoque e geração de contas a receber em transação única';

comment on function public.cancelar_venda_atomico(uuid, uuid, uuid) is
  'Cancela venda faturada com devolução de estoque e cancelamento de títulos em aberto';
