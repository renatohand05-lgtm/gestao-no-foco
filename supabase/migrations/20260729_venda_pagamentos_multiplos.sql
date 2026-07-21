-- Sprint 14 Adendo — pagamentos múltiplos + aprovação desconto
-- Execute após 20260728

/* ─── venda_pagamentos ─────────────────────────────────────── */

create table if not exists public.venda_pagamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  venda_id uuid not null references public.vendas (id) on delete cascade,
  forma_pagamento_id uuid not null references public.formas_pagamento (id) on delete restrict,
  valor numeric(15, 2) not null check (valor > 0),
  quantidade_parcelas integer not null default 1
    check (quantidade_parcelas >= 1 and quantidade_parcelas <= 48),
  taxa_percent numeric(8, 4) not null default 0 check (taxa_percent >= 0),
  data_prevista date,
  conta_bancaria_id uuid references public.contas_bancarias (id) on delete set null,
  observacao text,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_venda_pagamentos_venda
  on public.venda_pagamentos (tenant_id, venda_id);

alter table public.venda_pagamentos enable row level security;

drop policy if exists "Membros gerenciam venda_pagamentos" on public.venda_pagamentos;
create policy "Membros gerenciam venda_pagamentos"
  on public.venda_pagamentos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = venda_pagamentos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = venda_pagamentos.tenant_id and tm.user_id = auth.uid()
    )
  );

/* ─── RPC: faturar com pagamentos múltiplos ────────────────── */

create or replace function public.faturar_venda_com_pagamentos_atomico(
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
  v_pay record;
  v_forma public.formas_pagamento%rowtype;
  v_item record;
  v_estoque numeric;
  v_estoque_novo numeric;
  v_referencia text;
  v_sum numeric(15, 2);
  v_parcelas integer;
  v_grupo uuid;
  v_total_cents bigint;
  v_base_cents bigint;
  v_remainder bigint;
  v_valor_parcela numeric(15, 2);
  v_vencimento date;
  v_parcela integer;
  v_descricao text;
  v_pay_count integer;
begin
  perform public.assert_tenant_member(p_tenant_id);

  select * into v_venda
  from public.vendas
  where id = p_venda_id and tenant_id = p_tenant_id and deleted_at is null
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
    select 1 from public.venda_itens vi
    where vi.venda_id = p_venda_id and vi.tenant_id = p_tenant_id and vi.deleted_at is null
  ) then
    raise exception 'A venda precisa ter pelo menos um item para ser faturada.';
  end if;

  select count(*), coalesce(sum(valor), 0)
  into v_pay_count, v_sum
  from public.venda_pagamentos
  where venda_id = p_venda_id and tenant_id = p_tenant_id;

  if v_pay_count = 0 then
    -- fallback: usa forma única da venda
    return public.faturar_venda_atomico(p_tenant_id, p_venda_id, p_created_by);
  end if;

  if abs(v_sum - v_venda.total) > 0.01 then
    raise exception
      'Soma dos pagamentos (R$ %) difere do total da venda (R$ %).',
      v_sum, v_venda.total;
  end if;

  v_referencia := format(
    'Venda #%s (ID: %s)',
    lpad(v_venda.numero::text, 6, '0'),
    v_venda.id
  );

  -- estoque
  for v_item in
    select vi.produto_id, min(vi.descricao) as descricao,
           sum(vi.quantidade) as quantidade_total, p.estoque_atual, p.tipo
    from public.venda_itens vi
    join public.produtos p on p.id = vi.produto_id and p.tenant_id = p_tenant_id and p.deleted_at is null
    where vi.venda_id = p_venda_id and vi.tenant_id = p_tenant_id
      and vi.deleted_at is null and vi.produto_id is not null and vi.tipo_item <> 'servico'
    group by vi.produto_id, p.estoque_atual, p.tipo
  loop
    if v_item.quantidade_total > v_item.estoque_atual then
      raise exception 'Estoque insuficiente para "%". Disponível: %.',
        v_item.descricao, v_item.estoque_atual;
    end if;
    v_estoque := coalesce(v_item.estoque_atual, 0);
    v_estoque_novo := v_estoque - v_item.quantidade_total;
    insert into public.estoque_movimentacoes (
      tenant_id, produto_id, tipo, quantidade, quantidade_anterior, quantidade_nova,
      motivo, origem, observacoes, created_by
    ) values (
      p_tenant_id, v_item.produto_id, 'saida', v_item.quantidade_total,
      v_estoque, v_estoque_novo,
      format('Faturamento da venda %s', v_referencia),
      'venda', v_referencia, p_created_by
    );
    update public.produtos
    set estoque_atual = v_estoque_novo
    where id = v_item.produto_id and tenant_id = p_tenant_id and deleted_at is null;
  end loop;

  -- financeiro por pagamento
  for v_pay in
    select * from public.venda_pagamentos
    where venda_id = p_venda_id and tenant_id = p_tenant_id
    order by ordem, created_at
  loop
    select * into v_forma
    from public.formas_pagamento
    where id = v_pay.forma_pagamento_id
      and tenant_id = p_tenant_id and deleted_at is null and ativo = true;

    if not found then
      raise exception 'Forma de pagamento inválida em um dos pagamentos.';
    end if;

    if not v_forma.gera_financeiro then
      continue;
    end if;

    v_parcelas := coalesce(v_pay.quantidade_parcelas, 1);
    v_grupo := case when v_parcelas > 1 then gen_random_uuid() else null end;
    v_total_cents := round(v_pay.valor * 100)::bigint;
    v_base_cents := v_total_cents / v_parcelas;
    v_remainder := v_total_cents - (v_base_cents * v_parcelas);
    v_descricao := format('Venda #%s — %s', lpad(v_venda.numero::text, 6, '0'), v_forma.nome);

    for v_parcela in 1..v_parcelas loop
      v_valor_parcela := (v_base_cents + case when v_parcela <= v_remainder then 1 else 0 end) / 100.0;
      v_vencimento := coalesce(v_pay.data_prevista, current_date)
        + (coalesce(v_forma.dias_compensacao, 0) || ' days')::interval
        + make_interval(months => v_parcela - 1);

      insert into public.contas_receber (
        tenant_id, cliente_id, venda_id, forma_pagamento_id,
        descricao, status, valor_original, desconto, juros, multa, valor_recebido,
        data_emissao, data_competencia, data_vencimento,
        parcela_numero, parcela_total, grupo_parcelamento_id,
        categoria_financeira_id, centro_custo_id, conta_bancaria_id
      ) values (
        p_tenant_id, v_venda.cliente_id, p_venda_id, v_pay.forma_pagamento_id,
        case when v_parcelas > 1
          then format('%s (%s/%s)', v_descricao, v_parcela, v_parcelas)
          else v_descricao
        end,
        'aberto', v_valor_parcela, 0, 0, 0, 0,
        current_date, current_date, v_vencimento::date,
        v_parcela, v_parcelas, v_grupo,
        v_venda.categoria_financeira_id, v_venda.centro_custo_id, v_pay.conta_bancaria_id
      );
    end loop;
  end loop;

  -- define forma principal como a de maior valor (compat)
  update public.vendas v
  set
    status = 'faturado',
    forma_pagamento_id = (
      select vp.forma_pagamento_id
      from public.venda_pagamentos vp
      where vp.venda_id = p_venda_id
      order by vp.valor desc
      limit 1
    ),
    updated_at = now()
  where v.id = p_venda_id and v.tenant_id = p_tenant_id;

  return p_venda_id;
end;
$$;

grant execute on function public.faturar_venda_com_pagamentos_atomico(uuid, uuid, uuid) to authenticated;

/* ─── Estorno proporcional de CRs na cancelamento (já existente) ──
   cancelar_venda_atomico já cancela CRs abertos — suficiente para
   estorno proporcional de títulos gerados pelos pagamentos. */

comment on table public.venda_pagamentos is
  'Formas de pagamento split na mesma venda; soma deve igualar total.';
