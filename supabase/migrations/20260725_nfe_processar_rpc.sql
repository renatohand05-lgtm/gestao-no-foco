-- Sprint 13.22 Gate 2 — RPC atômica processar_nfe_entrada_atomico
-- Execute MANUALMENTE após 20260725_nfe_entrada_importacao.sql
-- Atomicidade: estoque + custo médio + itens OS + Conta a Pagar + status + eventos
-- Service role NÃO é necessária no client; chamada via sessão do membro (SECURITY INVOKER checks membership).

create or replace function public.processar_nfe_entrada_atomico(
  p_tenant_id uuid,
  p_nota_id uuid,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_nota public.notas_fiscais_entrada%rowtype;
  v_item public.notas_fiscais_entrada_itens%rowtype;
  v_produto record;
  v_saldo numeric;
  v_custo_atual numeric;
  v_novo_custo numeric;
  v_q_nova numeric;
  v_mov_id uuid;
  v_os_item_id uuid;
  v_cp_id uuid;
  v_grupo uuid;
  v_parcela int;
  v_total_parcelas int;
  v_dup jsonb;
  v_valor_parcela numeric;
  v_venc date;
  v_base_cents bigint;
  v_remainder bigint;
  v_total_cents bigint;
  v_eventos int := 0;
  v_estoque int := 0;
  v_os int := 0;
begin
  if p_tenant_id is null or p_nota_id is null then
    raise exception 'parametros_invalidos';
  end if;

  if auth.uid() is null then
    raise exception 'nao_autenticado';
  end if;

  if not exists (
    select 1 from public.tenant_members tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
  ) then
    raise exception 'tenant_negado';
  end if;

  select * into v_nota
  from public.notas_fiscais_entrada
  where id = p_nota_id
    and tenant_id = p_tenant_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'nota_nao_encontrada';
  end if;

  if v_nota.status = 'importada' then
    return jsonb_build_object(
      'ok', true,
      'already', true,
      'nota_id', v_nota.id,
      'conta_pagar_id', v_nota.conta_pagar_id
    );
  end if;

  if v_nota.status not in ('aguardando_conferencia', 'validada', 'erro', 'processando') then
    raise exception 'status_invalido:%', v_nota.status;
  end if;

  if v_nota.fornecedor_id is null then
    raise exception 'fornecedor_obrigatorio';
  end if;

  update public.notas_fiscais_entrada
  set status = 'processando',
      erro_mensagem = null,
      updated_at = now()
  where id = v_nota.id;

  insert into public.notas_fiscais_entrada_eventos (
    tenant_id, nota_fiscal_id, tipo, descricao, resultado, user_id
  ) values (
    p_tenant_id, p_nota_id, 'importacao_iniciada',
    'Processamento atômico via RPC', 'ok', p_user_id
  );
  v_eventos := v_eventos + 1;

  for v_item in
    select *
    from public.notas_fiscais_entrada_itens
    where nota_fiscal_id = p_nota_id
      and tenant_id = p_tenant_id
      and deleted_at is null
    order by numero_item
  loop
    if v_item.destino = 'pendente' then
      raise exception 'item_pendente:%', v_item.numero_item;
    end if;

    if v_item.destino = 'misto'
       and round((coalesce(v_item.quantidade_estoque,0) + coalesce(v_item.quantidade_os,0))::numeric, 4)
          <> round(v_item.quantidade::numeric, 4) then
      raise exception 'quantidade_mista_invalida:%', v_item.numero_item;
    end if;

    if v_item.destino in ('estoque', 'os', 'misto') and v_item.produto_id is null then
      raise exception 'produto_obrigatorio:%', v_item.numero_item;
    end if;

    if v_item.destino in ('os', 'misto') and v_item.ordem_servico_id is null then
      raise exception 'os_obrigatoria:%', v_item.numero_item;
    end if;

    if v_item.destino = 'ignorar' and coalesce(trim(v_item.motivo_ignorar), '') = '' then
      raise exception 'motivo_ignorar_obrigatorio:%', v_item.numero_item;
    end if;

    -- ===== ESTOQUE + CUSTO MÉDIO PONDERADO =====
    if v_item.destino in ('estoque', 'misto')
       and coalesce(v_item.quantidade_estoque, 0) > 0
       and v_item.produto_id is not null then

      if v_item.estoque_movimentacao_id is null then
        select id, estoque_atual, custo, tipo, deleted_at
          into v_produto
        from public.produtos
        where id = v_item.produto_id
          and tenant_id = p_tenant_id
        for update;

        if not found or v_produto.deleted_at is not null then
          raise exception 'produto_nao_encontrado:%', v_item.numero_item;
        end if;
        if v_produto.tipo = 'servico' then
          raise exception 'produto_servico_sem_estoque:%', v_item.numero_item;
        end if;

        v_saldo := coalesce(v_produto.estoque_atual, 0);
        v_custo_atual := coalesce(v_produto.custo, 0);
        v_q_nova := v_saldo + v_item.quantidade_estoque;

        if v_saldo <= 0 then
          v_novo_custo := v_item.custo_unitario_final;
        else
          v_novo_custo :=
            ((v_saldo * v_custo_atual) + (v_item.quantidade_estoque * v_item.custo_unitario_final))
            / (v_saldo + v_item.quantidade_estoque);
        end if;

        insert into public.estoque_movimentacoes (
          tenant_id, produto_id, tipo, quantidade,
          quantidade_anterior, quantidade_nova,
          motivo, origem, observacoes, created_by
        ) values (
          p_tenant_id, v_item.produto_id, 'entrada', v_item.quantidade_estoque,
          v_saldo, v_q_nova,
          format('NF-e %s item %s', coalesce(v_nota.numero, left(v_nota.chave_acesso, 8)), v_item.numero_item),
          'compra',
          format('nfe:%s;item:%s;custo_unit:%s', v_nota.id, v_item.id, v_item.custo_unitario_final),
          p_user_id
        )
        returning id into v_mov_id;

        update public.produtos
        set estoque_atual = v_q_nova,
            custo = v_novo_custo,
            updated_at = now()
        where id = v_item.produto_id
          and tenant_id = p_tenant_id;

        update public.notas_fiscais_entrada_itens
        set estoque_movimentacao_id = v_mov_id,
            updated_at = now()
        where id = v_item.id;

        insert into public.notas_fiscais_entrada_eventos (
          tenant_id, nota_fiscal_id, tipo, descricao, resultado,
          referencia_tipo, referencia_id, user_id
        ) values (
          p_tenant_id, p_nota_id, 'estoque_movimentado',
          format('Entrada estoque item %s (custo médio atualizado)', v_item.numero_item),
          'ok', 'estoque_movimentacao', v_mov_id, p_user_id
        );
        v_estoque := v_estoque + 1;
        v_eventos := v_eventos + 1;
      end if;
    end if;

    -- ===== OS DIRETA (custo real; sem estoque) =====
    if v_item.destino in ('os', 'misto')
       and coalesce(v_item.quantidade_os, 0) > 0
       and v_item.produto_id is not null
       and v_item.ordem_servico_id is not null then

      if v_item.ordem_servico_item_id is null then
        if not exists (
          select 1 from public.ordens_servico os
          where os.id = v_item.ordem_servico_id
            and os.tenant_id = p_tenant_id
            and os.deleted_at is null
            and os.status not in ('faturado', 'cancelado', 'cancelada')
        ) then
          raise exception 'os_invalida_ou_outro_tenant:%', v_item.numero_item;
        end if;

        insert into public.ordem_servico_itens (
          tenant_id, ordem_servico_id, produto_id, descricao,
          tipo_item, categoria_item, quantidade, valor_unitario,
          desconto, acrescimo, valor_total, custo_unitario,
          peca_origem, fornecedor_sugerido_id, estoque_status,
          aprovacao_status, execucao_status, observacoes, ordem
        ) values (
          p_tenant_id, v_item.ordem_servico_id, v_item.produto_id, v_item.descricao_original,
          'produto', 'peca', v_item.quantidade_os, v_item.custo_unitario_final,
          0, 0, round(v_item.quantidade_os * v_item.custo_unitario_final, 2),
          v_item.custo_unitario_final,
          'compra', v_nota.fornecedor_id, 'pendente_compra',
          'pendente', 'pendente',
          format('Origem NF-e %s chave %s', coalesce(v_nota.numero, ''), v_nota.chave_acesso),
          coalesce((
            select max(osi.ordem) + 1
            from public.ordem_servico_itens osi
            where osi.ordem_servico_id = v_item.ordem_servico_id
              and osi.deleted_at is null
          ), 0)
        )
        returning id into v_os_item_id;

        update public.notas_fiscais_entrada_itens
        set ordem_servico_item_id = v_os_item_id,
            updated_at = now()
        where id = v_item.id;

        insert into public.notas_fiscais_entrada_eventos (
          tenant_id, nota_fiscal_id, tipo, descricao, resultado,
          referencia_tipo, referencia_id, user_id
        ) values (
          p_tenant_id, p_nota_id, 'item_adicionado_os',
          format('Item %s adicionado à OS (custo real NF)', v_item.numero_item),
          'ok', 'ordem_servico', v_item.ordem_servico_id, p_user_id
        );
        v_os := v_os + 1;
        v_eventos := v_eventos + 1;
      end if;
    end if;
  end loop;

  -- ===== CONTA A PAGAR (opcional, única por nota) =====
  v_cp_id := v_nota.conta_pagar_id;
  if v_nota.gerar_conta_pagar and v_cp_id is null then
    if v_nota.categoria_financeira_id is null
       or v_nota.plano_conta_id is null
       or v_nota.centro_custo_id is null then
      raise exception 'classificadores_cp_obrigatorios';
    end if;

    v_total_parcelas := greatest(jsonb_array_length(coalesce(v_nota.duplicatas, '[]'::jsonb)), 1);
    if v_total_parcelas > 1 then
      v_grupo := gen_random_uuid();
    else
      v_grupo := null;
    end if;

    v_total_cents := round(v_nota.valor_total * 100)::bigint;
    v_base_cents := v_total_cents / v_total_parcelas;
    v_remainder := v_total_cents - (v_base_cents * v_total_parcelas);

    for v_parcela in 1..v_total_parcelas loop
      if v_total_parcelas > 1 and jsonb_array_length(v_nota.duplicatas) >= v_parcela then
        v_dup := v_nota.duplicatas -> (v_parcela - 1);
        v_valor_parcela := coalesce((v_dup->>'valor')::numeric, 0);
        v_venc := coalesce((v_dup->>'vencimento')::date, coalesce(v_nota.data_entrada, current_date));
        if v_valor_parcela <= 0 then
          if v_parcela = v_total_parcelas then
            v_valor_parcela := (v_base_cents + v_remainder) / 100.0;
          else
            v_valor_parcela := v_base_cents / 100.0;
          end if;
        end if;
      else
        v_valor_parcela := v_nota.valor_total;
        v_venc := coalesce(v_nota.data_entrada, current_date);
      end if;

      insert into public.contas_pagar (
        tenant_id, fornecedor_id, fornecedor_nome,
        categoria_financeira_id, centro_custo_id, plano_conta_id,
        descricao, valor_original, status,
        data_emissao, data_competencia, data_vencimento,
        grupo_parcelamento_id, parcela_numero, parcela_total,
        observacoes
      ) values (
        p_tenant_id, v_nota.fornecedor_id, v_nota.emitente_razao_social,
        v_nota.categoria_financeira_id, v_nota.centro_custo_id, v_nota.plano_conta_id,
        format('NF-e %s %s', coalesce(v_nota.numero, ''), coalesce(v_nota.emitente_razao_social, '')),
        v_valor_parcela, 'aberto',
        coalesce(v_nota.data_emissao, current_date),
        coalesce(v_nota.data_emissao, current_date),
        v_venc,
        v_grupo, v_parcela, v_total_parcelas,
        format('Importação NF-e chave %s', v_nota.chave_acesso)
      )
      returning id into v_cp_id;

      if v_parcela = 1 then
        -- primeiro id permanece em v_cp_id até o fim do loop se só 1 parcela
        null;
      end if;
    end loop;

    -- vínculo principal da nota = 1ª parcela
    select id into v_cp_id
    from public.contas_pagar
    where tenant_id = p_tenant_id
      and observacoes = format('Importação NF-e chave %s', v_nota.chave_acesso)
      and deleted_at is null
    order by parcela_numero
    limit 1;

    insert into public.notas_fiscais_entrada_eventos (
      tenant_id, nota_fiscal_id, tipo, descricao, resultado,
      referencia_tipo, referencia_id, user_id
    ) values (
      p_tenant_id, p_nota_id, 'conta_pagar_criada',
      format('Conta a Pagar gerada (%s parcela(s))', v_total_parcelas),
      'ok', 'conta_pagar', v_cp_id, p_user_id
    );
    v_eventos := v_eventos + 1;
  end if;

  update public.notas_fiscais_entrada
  set status = 'importada',
      conta_pagar_id = coalesce(v_cp_id, conta_pagar_id),
      processado_em = now(),
      erro_mensagem = null,
      updated_at = now()
  where id = p_nota_id
    and tenant_id = p_tenant_id;

  insert into public.notas_fiscais_entrada_eventos (
    tenant_id, nota_fiscal_id, tipo, descricao, resultado, user_id,
    payload
  ) values (
    p_tenant_id, p_nota_id, 'importacao_concluida',
    'NF-e importada com sucesso (RPC atômica)', 'ok', p_user_id,
    jsonb_build_object('estoque', v_estoque, 'os', v_os, 'eventos', v_eventos)
  );

  return jsonb_build_object(
    'ok', true,
    'already', false,
    'nota_id', p_nota_id,
    'conta_pagar_id', coalesce(v_cp_id, v_nota.conta_pagar_id),
    'estoque_movimentos', v_estoque,
    'os_itens', v_os
  );
end;
$$;

revoke all on function public.processar_nfe_entrada_atomico(uuid, uuid, uuid) from public;
grant execute on function public.processar_nfe_entrada_atomico(uuid, uuid, uuid) to authenticated;
grant execute on function public.processar_nfe_entrada_atomico(uuid, uuid, uuid) to service_role;

comment on function public.processar_nfe_entrada_atomico(uuid, uuid, uuid) is
  'Importação atômica NF-e: estoque+custo médio, OS custo real, CP opcional, idempotente.';

notify pgrst, 'reload schema';
