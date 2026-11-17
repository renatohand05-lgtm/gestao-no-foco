-- Dados completos da empresa para o assistente de IA ("Gestão no Foco").
-- A IA nunca acessa o banco livremente: ela só enxerga este retrato (jsonb), montado
-- aqui, com limites de linhas e sem telefone/CPF/e-mail de ninguém.
-- Roda com os privilégios do usuário (RLS) e exige vínculo em tenant_members.
-- Faturamento = OS faturadas (mesma base do Painel Executivo e das Metas); em empresas
-- sem OS, usa as vendas faturadas.

-- Base de faturamento (ref, data, valor, cliente) — usada só pela função principal.
create or replace function public.ai_assistant_faturamento_base(p_tenant uuid, p_usa_os boolean)
returns table (ref_id uuid, data_ref date, valor numeric, cliente_id uuid)
language sql
stable
security invoker
set search_path = public
as $fn$
  select o.id, coalesce(o.data_conclusao, o.data_abertura)::date, o.valor_total, o.cliente_id
  from public.ordens_servico o
  where p_usa_os and o.tenant_id = p_tenant and o.deleted_at is null and o.status = 'faturado'
  union all
  select v.id, v.data_venda::date, v.total, v.cliente_id
  from public.vendas v
  where not p_usa_os and v.tenant_id = p_tenant and v.deleted_at is null and v.status = 'faturado';
$fn$;

revoke all on function public.ai_assistant_faturamento_base(uuid, boolean) from public, anon;
grant execute on function public.ai_assistant_faturamento_base(uuid, boolean) to authenticated;

create or replace function public.ai_assistant_snapshot(p_tenant uuid, p_hoje date default null)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $fn$
declare
  v_hoje date := coalesce(p_hoje, (now() at time zone 'America/Sao_Paulo')::date);
  v_mes date := date_trunc('month', coalesce(p_hoje, (now() at time zone 'America/Sao_Paulo')::date))::date;
  v_mes_ant date;
  v_dias_mes int;
  v_dia int;
  v_usa_os boolean;
  v_out jsonb := '{}'::jsonb;
  v_sec jsonb;
  v_arr jsonb;
  v_n numeric;
  v_a numeric;
  v_b numeric;
  v_c numeric;
  v_meta numeric;
begin
  if not exists (
    select 1 from public.tenant_members tm where tm.tenant_id = p_tenant and tm.user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_mes_ant := (v_mes - interval '1 month')::date;
  v_dias_mes := extract(day from (v_mes + interval '1 month' - interval '1 day'))::int;
  v_dia := extract(day from v_hoje)::int;

  select exists (
    select 1 from public.ordens_servico o
    where o.tenant_id = p_tenant and o.deleted_at is null and o.status = 'faturado'
  ) into v_usa_os;

  -- ───────── empresa ─────────
  begin
    select jsonb_build_object('nome', t.name, 'segmento', t.segment,
                              'base_faturamento', case when v_usa_os then 'ordens_servico_faturadas' else 'vendas_faturadas' end)
      into v_sec from public.tenants t where t.id = p_tenant;
  exception when others then
    v_sec := jsonb_build_object('erro', sqlerrm);
  end;
  v_out := v_out || jsonb_build_object('empresa', coalesce(v_sec, '{}'::jsonb), 'hoje', v_hoje,
                                       'dia_do_mes', v_dia, 'dias_no_mes', v_dias_mes);

  -- ───────── faturamento ─────────
  begin
    select coalesce(jsonb_agg(jsonb_build_object('mes', to_char(g.m, 'YYYY-MM'), 'valor', round(coalesce(s.v, 0), 2), 'qtd', coalesce(s.n, 0)) order by g.m), '[]'::jsonb)
      into v_arr
    from generate_series((v_mes - interval '12 months')::date, v_mes, interval '1 month') as g(m)
    left join (
      select date_trunc('month', f.data_ref)::date m, sum(f.valor) v, count(*)::int n
      from public.ai_assistant_faturamento_base(p_tenant, v_usa_os) f
      group by 1
    ) s on s.m = g.m::date;

    -- mês atual, mês anterior inteiro e mês anterior até o mesmo dia (comparação justa)
    select coalesce(sum(f.valor) filter (where f.data_ref >= v_mes), 0),
           count(*) filter (where f.data_ref >= v_mes),
           coalesce(sum(f.valor) filter (where f.data_ref >= v_mes_ant and f.data_ref < v_mes), 0),
           count(*) filter (where f.data_ref >= v_mes_ant and f.data_ref < v_mes),
           coalesce(sum(f.valor) filter (where f.data_ref >= v_mes_ant and f.data_ref < v_mes_ant + v_dia), 0)
      into v_a, v_n, v_b, v_c, v_meta
    from public.ai_assistant_faturamento_base(p_tenant, v_usa_os) f
    where f.data_ref >= v_mes_ant;

    v_sec := jsonb_build_object(
      'historico_desde', (select to_char(min(f.data_ref), 'YYYY-MM') from public.ai_assistant_faturamento_base(p_tenant, v_usa_os) f),
      'serie_13_meses', v_arr,
      'mes_atual', jsonb_build_object('valor', round(v_a, 2), 'qtd', v_n::int,
                      'ticket_medio', case when v_n > 0 then round(v_a / v_n, 2) end,
                      'projecao_linear_fim_do_mes', case when v_dia > 0 then round(v_a / v_dia * v_dias_mes, 2) end),
      'mes_anterior', jsonb_build_object('valor', round(v_b, 2), 'qtd', v_c::int,
                      'ticket_medio', case when v_c > 0 then round(v_b / v_c, 2) end,
                      'ate_o_mesmo_dia', round(v_meta, 2))
    );
  exception when others then
    v_sec := jsonb_build_object('erro', sqlerrm);
  end;
  v_out := v_out || jsonb_build_object('faturamento', v_sec);

  -- ───────── metas (mês, próximos meses, ano) ─────────
  begin
    select sum(m.valor_meta) into v_meta
    from public.metas_vendas_mensais m
    where m.tenant_id = p_tenant and m.deleted_at is null and m.centro_custo_id is null and m.competencia = v_mes;

    select coalesce(jsonb_agg(jsonb_build_object('mes', to_char(x.c, 'YYYY-MM'), 'meta', round(x.v, 2)) order by x.c), '[]'::jsonb)
      into v_arr
    from (
      select m.competencia c, sum(m.valor_meta) v
      from public.metas_vendas_mensais m
      where m.tenant_id = p_tenant and m.deleted_at is null and m.centro_custo_id is null
        and m.competencia > v_mes and m.competencia <= (v_mes + interval '3 months')::date
      group by 1
    ) x;

    select sum(m.valor_meta) into v_b
    from public.metas_vendas_mensais m
    where m.tenant_id = p_tenant and m.deleted_at is null and m.centro_custo_id is null
      and m.competencia >= date_trunc('year', v_mes)::date and m.competencia < (date_trunc('year', v_mes) + interval '1 year')::date;

    -- realizado do ano só nos meses que têm meta (para não comparar ano cheio com meta parcial)
    select coalesce(sum(f.valor), 0) into v_c
    from public.ai_assistant_faturamento_base(p_tenant, v_usa_os) f
    where date_trunc('month', f.data_ref)::date in (
      select m.competencia from public.metas_vendas_mensais m
      where m.tenant_id = p_tenant and m.deleted_at is null and m.centro_custo_id is null and m.valor_meta > 0
        and m.competencia >= date_trunc('year', v_mes)::date and m.competencia < (date_trunc('year', v_mes) + interval '1 year')::date
    );

    select count(distinct m.competencia) into v_n
    from public.metas_vendas_mensais m
    where m.tenant_id = p_tenant and m.deleted_at is null and m.centro_custo_id is null and m.valor_meta > 0
      and m.competencia >= date_trunc('year', v_mes)::date and m.competencia < (date_trunc('year', v_mes) + interval '1 year')::date;

    select coalesce(sum(f.valor), 0) into v_a
    from public.ai_assistant_faturamento_base(p_tenant, v_usa_os) f
    where f.data_ref >= v_mes and f.data_ref < (v_mes + interval '1 month')::date;

    v_sec := jsonb_build_object(
      'tem_meta_no_mes', v_meta is not null and v_meta > 0,
      'mes_atual', case when v_meta is not null and v_meta > 0 then jsonb_build_object(
          'meta', round(v_meta, 2),
          'realizado', round(v_a, 2),
          'percentual_atingido', round(v_a / v_meta * 100, 1),
          'falta_para_meta', round(greatest(v_meta - v_a, 0), 2),
          'dias_restantes_no_mes', v_dias_mes - v_dia,
          'faturamento_diario_necessario', case when v_dias_mes - v_dia > 0 then round(greatest(v_meta - v_a, 0) / (v_dias_mes - v_dia), 2) end,
          'faturamento_diario_atual', case when v_dia > 0 then round(v_a / v_dia, 2) end
        ) end,
      'proximos_meses', v_arr,
      'ano', case when v_b is not null and v_b > 0 then jsonb_build_object(
          'meses_com_meta', v_n::int, 'meta_dos_meses_com_meta', round(v_b, 2), 'realizado_nesses_meses', round(v_c, 2),
          'percentual_atingido', round(v_c / v_b * 100, 1)) end
    );
  exception when others then
    v_sec := jsonb_build_object('erro', sqlerrm);
  end;
  v_out := v_out || jsonb_build_object('metas', v_sec);

  -- ───────── ordens de serviço ─────────
  if exists (select 1 from public.ordens_servico o where o.tenant_id = p_tenant and o.deleted_at is null) then
    begin
      -- OS em andamento (não faturadas/canceladas/rascunho), as de maior valor primeiro
      select coalesce(jsonb_agg(to_jsonb(x) - 'ord' order by x.ord), '[]'::jsonb) into v_arr
      from (
        select o.numero, o.status, c.nome as cliente,
               nullif(trim(coalesce(ve.marca, '') || ' ' || coalesce(ve.modelo, '')), '') as veiculo,
               ve.placa, m.nome_completo as mecanico,
               round(coalesce(o.valor_total, 0), 2) as valor,
               (v_hoje - o.data_abertura) as dias_desde_abertura,
               (v_hoje - o.updated_at::date) as dias_sem_movimento,
               o.previsao_entrega::date as previsao_entrega,
               (o.previsao_entrega is not null and o.previsao_entrega::date < v_hoje) as atrasada,
               row_number() over (order by o.valor_total desc nulls last, o.data_abertura) as ord
        from public.ordens_servico o
        left join public.clientes c on c.id = o.cliente_id
        left join public.veiculos ve on ve.id = o.veiculo_id
        left join public.mecanicos m on m.id = o.mecanico_id
        where o.tenant_id = p_tenant and o.deleted_at is null
          and o.status not in ('faturado', 'cancelado', 'rascunho')
      ) x where x.ord <= 25;

      select coalesce(jsonb_object_agg(s.status, jsonb_build_object('qtd', s.n, 'valor', round(s.v, 2))), '{}'::jsonb)
        into v_sec
      from (
        select o.status, count(*)::int n, coalesce(sum(o.valor_total), 0) v
        from public.ordens_servico o
        where o.tenant_id = p_tenant and o.deleted_at is null
          and o.status not in ('faturado', 'cancelado', 'rascunho')
        group by 1
      ) s;

      v_out := v_out || jsonb_build_object('os', jsonb_build_object(
        'em_andamento_por_status', v_sec,
        'em_andamento_lista', v_arr,
        'rascunhos', (select count(*) from public.ordens_servico o where o.tenant_id = p_tenant and o.deleted_at is null and o.status = 'rascunho'),
        'ultimos_90_dias', (
          select jsonb_build_object(
            'faturadas_qtd', count(*) filter (where o.status = 'faturado'),
            'faturadas_valor', round(coalesce(sum(o.valor_total) filter (where o.status = 'faturado'), 0), 2),
            'ticket_medio', case when count(*) filter (where o.status = 'faturado') > 0
                then round(sum(o.valor_total) filter (where o.status = 'faturado') / count(*) filter (where o.status = 'faturado'), 2) end,
            'canceladas_qtd', count(*) filter (where o.status = 'cancelado'),
            'canceladas_valor', round(coalesce(sum(o.valor_total) filter (where o.status = 'cancelado'), 0), 2),
            'retornos_retrabalho_qtd', count(*) filter (where o.ordem_retorno_id is not null),
            'descontos_concedidos', round(coalesce(sum(o.desconto_total) filter (where o.status = 'faturado'), 0), 2),
            'descontos_percentual_do_bruto', case when coalesce(sum(o.subtotal) filter (where o.status = 'faturado'), 0) > 0
                then round(sum(o.desconto_total) filter (where o.status = 'faturado') / sum(o.subtotal) filter (where o.status = 'faturado') * 100, 1) end,
            'faturadas_sem_mecanico_percentual', case when count(*) filter (where o.status = 'faturado') > 0
                then round(count(*) filter (where o.status = 'faturado' and o.mecanico_id is null)::numeric / count(*) filter (where o.status = 'faturado') * 100, 0) end,
            'faturadas_sem_veiculo_percentual', case when count(*) filter (where o.status = 'faturado') > 0
                then round(count(*) filter (where o.status = 'faturado' and o.veiculo_id is null)::numeric / count(*) filter (where o.status = 'faturado') * 100, 0) end
          )
          from public.ordens_servico o
          where o.tenant_id = p_tenant and o.deleted_at is null
            and coalesce(o.data_conclusao, o.data_abertura) >= v_hoje - 90
        )
      ));
    exception when others then
      v_out := v_out || jsonb_build_object('os', jsonb_build_object('erro', sqlerrm));
    end;

    -- mix de receita, serviços e peças mais vendidos (itens das OS faturadas nos últimos 90 dias)
    begin
      select jsonb_build_object(
        'mix_receita_90d', coalesce((
          select jsonb_agg(jsonb_build_object('categoria', k.cat, 'receita', round(k.r, 2), 'itens', k.n,
                           'margem_percentual', case when k.r > 0 and k.custo > 0 then round((k.r - k.custo) / k.r * 100, 1) end) order by k.r desc)
          from (
            select coalesce(i.categoria_item, i.tipo_item, 'outros') cat, sum(i.valor_total) r, count(*)::int n,
                   sum(coalesce(i.custo_unitario, 0) * coalesce(i.quantidade, 0)) custo
            from public.ordem_servico_itens i
            join public.ordens_servico o on o.id = i.ordem_servico_id
            where i.tenant_id = p_tenant and i.deleted_at is null and o.deleted_at is null and o.status = 'faturado'
              and coalesce(o.data_conclusao, o.data_abertura) >= v_hoje - 90
            group by 1
          ) k
        ), '[]'::jsonb),
        'receita_em_itens_genericos_percentual', (
          select case when sum(i.valor_total) > 0 then round(
                   coalesce(sum(i.valor_total) filter (where lower(trim(i.descricao)) ~ '^(pe[çc]as( \(agregado da os\))?|servi[çc]o personalizado|m[ãa]o de obra|outros?)$'), 0)
                   / sum(i.valor_total) * 100, 0) end
          from public.ordem_servico_itens i
          join public.ordens_servico o on o.id = i.ordem_servico_id
          where i.tenant_id = p_tenant and i.deleted_at is null and o.deleted_at is null and o.status = 'faturado'
            and coalesce(o.data_conclusao, o.data_abertura) >= v_hoje - 90
        ),
        'servicos_mais_vendidos_90d', coalesce((
          select jsonb_agg(jsonb_build_object('descricao', k.descr, 'vezes', k.n, 'receita', round(k.r, 2)) order by k.ord)
          from (
            select max(i.descricao) descr, count(distinct o.id)::int n, sum(i.valor_total) r,
                   row_number() over (order by sum(i.valor_total) desc) ord
            from public.ordem_servico_itens i
            join public.ordens_servico o on o.id = i.ordem_servico_id
            where i.tenant_id = p_tenant and i.deleted_at is null and o.deleted_at is null and o.status = 'faturado'
              and coalesce(o.data_conclusao, o.data_abertura) >= v_hoje - 90
              and coalesce(i.categoria_item, 'servico') in ('servico', 'mao_obra')
            group by lower(trim(i.descricao))
          ) k where k.ord <= 10
        ), '[]'::jsonb),
        'pecas_mais_vendidas_90d', coalesce((
          select jsonb_agg(jsonb_build_object('descricao', k.descr, 'vezes', k.n, 'receita', round(k.r, 2),
                           'margem_percentual', case when k.r > 0 and k.custo > 0 then round((k.r - k.custo) / k.r * 100, 1) end) order by k.ord)
          from (
            select max(i.descricao) descr, count(distinct o.id)::int n, sum(i.valor_total) r,
                   sum(coalesce(i.custo_unitario, 0) * coalesce(i.quantidade, 0)) custo,
                   row_number() over (order by sum(i.valor_total) desc) ord
            from public.ordem_servico_itens i
            join public.ordens_servico o on o.id = i.ordem_servico_id
            where i.tenant_id = p_tenant and i.deleted_at is null and o.deleted_at is null and o.status = 'faturado'
              and coalesce(o.data_conclusao, o.data_abertura) >= v_hoje - 90
              and i.categoria_item = 'peca'
            group by lower(trim(i.descricao))
          ) k where k.ord <= 10
        ), '[]'::jsonb)
      ) into v_sec;
      v_out := v_out || jsonb_build_object('itens', v_sec);
    exception when others then
      v_out := v_out || jsonb_build_object('itens', jsonb_build_object('erro', sqlerrm));
    end;

    -- mecânicos/equipe (OS faturadas nos últimos 90 dias) e marcas de veículos (12 meses)
    begin
      select coalesce(jsonb_agg(to_jsonb(x) - 'ord' order by x.ord), '[]'::jsonb) into v_arr
      from (
        select m.nome_completo as nome, count(*)::int as os_faturadas, round(sum(o.valor_total), 2) as receita,
               round(sum(o.valor_total) / count(*), 2) as ticket_medio,
               row_number() over (order by sum(o.valor_total) desc) ord
        from public.ordens_servico o
        join public.mecanicos m on m.id = o.mecanico_id
        where o.tenant_id = p_tenant and o.deleted_at is null and o.status = 'faturado'
          and coalesce(o.data_conclusao, o.data_abertura) >= v_hoje - 90
        group by m.id, m.nome_completo
      ) x where x.ord <= 10;
      v_out := v_out || jsonb_build_object('equipe_90d', v_arr);

      select coalesce(jsonb_agg(to_jsonb(x) - 'ord' order by x.ord), '[]'::jsonb) into v_arr
      from (
        select ve.marca, count(*)::int as os_faturadas, round(sum(o.valor_total), 2) as receita,
               row_number() over (order by sum(o.valor_total) desc) ord
        from public.ordens_servico o
        join public.veiculos ve on ve.id = o.veiculo_id
        where o.tenant_id = p_tenant and o.deleted_at is null and o.status = 'faturado'
          and coalesce(o.data_conclusao, o.data_abertura) >= v_hoje - 365
          and ve.marca is not null
        group by ve.marca
      ) x where x.ord <= 8;
      v_out := v_out || jsonb_build_object('marcas_veiculos_12m', v_arr);
    exception when others then
      v_out := v_out || jsonb_build_object('equipe_erro', sqlerrm);
    end;
  end if;

  -- ───────── clientes ─────────
  begin
    with f0 as (
      select b.*, (b.cliente_id is null or c.nome is null or c.nome ilike 'cliente n_o %' or c.nome ilike 'a lan_ar%' or c.nome ilike 'consumidor%') as sem_id
      from public.ai_assistant_faturamento_base(p_tenant, v_usa_os) b
      left join public.clientes c on c.id = b.cliente_id
    ),
    f as (select * from f0 where not sem_id),
    pc as (
      select f.cliente_id, sum(f.valor) total, count(*)::int n, max(f.data_ref) ultima,
             coalesce(sum(f.valor) filter (where f.data_ref > v_hoje - 365), 0) total_12m
      from f group by 1
    )
    select jsonb_build_object(
      'faturamento_sem_cliente_identificado_12m', (
        select jsonb_build_object('qtd', count(*), 'valor', round(coalesce(sum(f0.valor), 0), 2),
               'percentual_do_faturamento', case when (select sum(x.valor) from f0 x where x.data_ref > v_hoje - 365) > 0
                  then round(coalesce(sum(f0.valor), 0) / (select sum(x.valor) from f0 x where x.data_ref > v_hoje - 365) * 100, 0) end)
        from f0 where f0.sem_id and f0.data_ref > v_hoje - 365
      ),
      'cadastrados', (select count(*) from public.clientes c where c.tenant_id = p_tenant and c.deleted_at is null and coalesce(c.ativo, true)),
      'novos_ultimos_30_dias', (select count(*) from public.clientes c where c.tenant_id = p_tenant and c.deleted_at is null and c.created_at >= (v_hoje - 30)),
      'compraram_ultimos_90_dias', (select count(*) from pc where pc.ultima > v_hoje - 90),
      'sem_comprar_ha_mais_de_90_dias', (select count(*) from pc where pc.ultima <= v_hoje - 90),
      'recorrentes_2_ou_mais_compras', (select count(*) from pc where pc.n >= 2),
      'concentracao_top5_percentual_12m', (
        select case when sum(t.total_12m) > 0 then round(sum(t.total_12m) filter (where t.rk <= 5) / sum(t.total_12m) * 100, 1) end
        from (select pc.total_12m, row_number() over (order by pc.total_12m desc) rk from pc where pc.total_12m > 0) t
      ),
      'melhores_clientes_12m', coalesce((
        select jsonb_agg(jsonb_build_object('nome', t.nome, 'receita_12m', round(t.total_12m, 2), 'compras', t.n,
                         'ultima_compra', t.ultima, 'dias_sem_comprar', v_hoje - t.ultima) order by t.rk)
        from (
          select c.nome, pc.total_12m, pc.n, pc.ultima, row_number() over (order by pc.total_12m desc) rk
          from pc join public.clientes c on c.id = pc.cliente_id where pc.total_12m > 0
        ) t where t.rk <= 10
      ), '[]'::jsonb),
      'para_reativar', coalesce((
        select jsonb_agg(jsonb_build_object('nome', t.nome, 'ultima_compra', t.ultima, 'dias_sem_comprar', v_hoje - t.ultima,
                         'total_gasto', round(t.total, 2), 'compras', t.n, 'ticket_medio', round(t.total / t.n, 2)) order by t.rk)
        from (
          select c.nome, pc.total, pc.n, pc.ultima, row_number() over (order by pc.total desc) rk
          from pc join public.clientes c on c.id = pc.cliente_id
          where pc.ultima <= v_hoje - 90 and pc.ultima > v_hoje - 540 and c.deleted_at is null
        ) t where t.rk <= 10
      ), '[]'::jsonb)
    ) into v_sec;
  exception when others then
    v_sec := jsonb_build_object('erro', sqlerrm);
  end;
  v_out := v_out || jsonb_build_object('clientes', v_sec);

  -- ───────── financeiro ─────────
  begin
    select jsonb_build_object(
      'contas_a_pagar', jsonb_build_object(
        'em_aberto', (select jsonb_build_object('qtd', count(*), 'valor', round(coalesce(sum(greatest(p.valor_original - coalesce(p.valor_pago, 0), 0)), 0), 2))
                      from public.contas_pagar p where p.tenant_id = p_tenant and p.deleted_at is null and p.status not in ('pago', 'cancelado')),
        'vencidas', (select jsonb_build_object('qtd', count(*), 'valor', round(coalesce(sum(greatest(p.valor_original - coalesce(p.valor_pago, 0), 0)), 0), 2))
                     from public.contas_pagar p where p.tenant_id = p_tenant and p.deleted_at is null and p.status not in ('pago', 'cancelado') and p.data_vencimento < v_hoje),
        'vencem_em_7_dias', (select jsonb_build_object('qtd', count(*), 'valor', round(coalesce(sum(greatest(p.valor_original - coalesce(p.valor_pago, 0), 0)), 0), 2))
                             from public.contas_pagar p where p.tenant_id = p_tenant and p.deleted_at is null and p.status not in ('pago', 'cancelado') and p.data_vencimento >= v_hoje and p.data_vencimento <= v_hoje + 7),
        'vencem_em_30_dias', (select jsonb_build_object('qtd', count(*), 'valor', round(coalesce(sum(greatest(p.valor_original - coalesce(p.valor_pago, 0), 0)), 0), 2))
                              from public.contas_pagar p where p.tenant_id = p_tenant and p.deleted_at is null and p.status not in ('pago', 'cancelado') and p.data_vencimento >= v_hoje and p.data_vencimento <= v_hoje + 30),
        'proximas', coalesce((
          select jsonb_agg(to_jsonb(x) - 'ord' order by x.ord) from (
            select coalesce(p.fornecedor_nome, 'Sem fornecedor') as fornecedor, p.descricao,
                   round(greatest(p.valor_original - coalesce(p.valor_pago, 0), 0), 2) as valor,
                   p.data_vencimento as vencimento, (p.data_vencimento - v_hoje) as dias_para_vencer,
                   row_number() over (order by p.data_vencimento, p.valor_original desc) ord
            from public.contas_pagar p
            where p.tenant_id = p_tenant and p.deleted_at is null and p.status not in ('pago', 'cancelado')
          ) x where x.ord <= 8
        ), '[]'::jsonb)
      ),
      'contas_a_receber', jsonb_build_object(
        'em_aberto', (select jsonb_build_object('qtd', count(*), 'valor', round(coalesce(sum(greatest(r.valor_original - coalesce(r.valor_recebido, 0), 0)), 0), 2))
                      from public.contas_receber r where r.tenant_id = p_tenant and r.deleted_at is null and r.status not in ('recebido', 'cancelado')),
        'vencidas', (select jsonb_build_object('qtd', count(*), 'valor', round(coalesce(sum(greatest(r.valor_original - coalesce(r.valor_recebido, 0), 0)), 0), 2))
                     from public.contas_receber r where r.tenant_id = p_tenant and r.deleted_at is null and r.status not in ('recebido', 'cancelado') and r.data_vencimento < v_hoje),
        'vencem_em_7_dias', (select jsonb_build_object('qtd', count(*), 'valor', round(coalesce(sum(greatest(r.valor_original - coalesce(r.valor_recebido, 0), 0)), 0), 2))
                             from public.contas_receber r where r.tenant_id = p_tenant and r.deleted_at is null and r.status not in ('recebido', 'cancelado') and r.data_vencimento >= v_hoje and r.data_vencimento <= v_hoje + 7),
        'vencem_em_30_dias', (select jsonb_build_object('qtd', count(*), 'valor', round(coalesce(sum(greatest(r.valor_original - coalesce(r.valor_recebido, 0), 0)), 0), 2))
                              from public.contas_receber r where r.tenant_id = p_tenant and r.deleted_at is null and r.status not in ('recebido', 'cancelado') and r.data_vencimento >= v_hoje and r.data_vencimento <= v_hoje + 30),
        'maiores_vencidas', coalesce((
          select jsonb_agg(to_jsonb(x) - 'ord' order by x.ord) from (
            select c.nome as cliente, r.descricao,
                   round(greatest(r.valor_original - coalesce(r.valor_recebido, 0), 0), 2) as valor,
                   r.data_vencimento as vencimento, (v_hoje - r.data_vencimento) as dias_em_atraso,
                   row_number() over (order by r.valor_original desc) ord
            from public.contas_receber r left join public.clientes c on c.id = r.cliente_id
            where r.tenant_id = p_tenant and r.deleted_at is null and r.status not in ('recebido', 'cancelado') and r.data_vencimento < v_hoje
          ) x where x.ord <= 8
        ), '[]'::jsonb)
      ),
      'saldo_em_contas', (select round(coalesce(sum(b.saldo_atual), 0), 2) from public.contas_bancarias b
                          where b.tenant_id = p_tenant and b.deleted_at is null and coalesce(b.ativo, true))
    ) into v_sec;
  exception when others then
    v_sec := jsonb_build_object('erro', sqlerrm);
  end;
  v_out := v_out || jsonb_build_object('financeiro', v_sec);

  -- ───────── despesas por categoria (competência) ─────────
  begin
    with d as (
      select coalesce(cf.nome, 'Sem categoria') cat,
             date_trunc('month', coalesce(p.data_competencia, p.data_vencimento))::date m,
             p.valor_original v, p.descricao, p.fornecedor_nome
      from public.contas_pagar p
      left join public.categorias_financeiras cf on cf.id = p.categoria_financeira_id
      where p.tenant_id = p_tenant and p.deleted_at is null and p.status <> 'cancelado'
        and coalesce(p.data_competencia, p.data_vencimento) >= v_mes_ant
        and coalesce(p.data_competencia, p.data_vencimento) < (v_mes + interval '1 month')::date
    )
    select jsonb_build_object(
      'total_mes_atual', (select round(coalesce(sum(v), 0), 2) from d where m = v_mes),
      'total_mes_anterior', (select round(coalesce(sum(v), 0), 2) from d where m = v_mes_ant),
      'por_categoria', coalesce((
        select jsonb_agg(jsonb_build_object('categoria', k.cat, 'mes_atual', round(k.atual, 2), 'mes_anterior', round(k.ant, 2)) order by k.ord)
        from (
          select cat, coalesce(sum(v) filter (where m = v_mes), 0) atual, coalesce(sum(v) filter (where m = v_mes_ant), 0) ant,
                 row_number() over (order by greatest(coalesce(sum(v) filter (where m = v_mes), 0), coalesce(sum(v) filter (where m = v_mes_ant), 0)) desc) ord
          from d group by cat
        ) k where k.ord <= 12
      ), '[]'::jsonb),
      'maiores_lancamentos_mes_atual', coalesce((
        select jsonb_agg(jsonb_build_object('fornecedor', coalesce(k.fornecedor_nome, 'Sem fornecedor'), 'descricao', k.descricao,
                         'categoria', k.cat, 'valor', round(k.v, 2)) order by k.ord)
        from (select d.*, row_number() over (order by d.v desc) ord from d where d.m = v_mes) k where k.ord <= 6
      ), '[]'::jsonb)
    ) into v_sec;
  exception when others then
    v_sec := jsonb_build_object('erro', sqlerrm);
  end;
  v_out := v_out || jsonb_build_object('despesas', v_sec);

  -- ───────── estoque (só produtos físicos) ─────────
  begin
    select count(*) into v_n
    from public.produtos p
    where p.tenant_id = p_tenant and p.deleted_at is null and p.tipo <> 'servico' and coalesce(p.ativo, true);

    if v_n > 0 then
      select jsonb_build_object(
        'produtos_fisicos', v_n,
        'abaixo_do_minimo_qtd', count(*) filter (where p.estoque_minimo > 0 and p.estoque_atual <= p.estoque_minimo),
        'zerados_qtd', count(*) filter (where coalesce(p.estoque_atual, 0) <= 0),
        'valor_em_estoque_a_custo', round(coalesce(sum(greatest(p.estoque_atual, 0) * coalesce(p.custo, 0)), 0), 2),
        'itens_para_repor', coalesce((
          select jsonb_agg(to_jsonb(x) - 'ord' order by x.ord) from (
            select q.nome, q.estoque_atual as atual, q.estoque_minimo as minimo,
                   row_number() over (order by (q.estoque_minimo - q.estoque_atual) desc) ord
            from public.produtos q
            where q.tenant_id = p_tenant and q.deleted_at is null and q.tipo <> 'servico' and coalesce(q.ativo, true)
              and q.estoque_minimo > 0 and q.estoque_atual <= q.estoque_minimo
          ) x where x.ord <= 10
        ), '[]'::jsonb)
      ) into v_sec
      from public.produtos p
      where p.tenant_id = p_tenant and p.deleted_at is null and p.tipo <> 'servico' and coalesce(p.ativo, true);
      v_out := v_out || jsonb_build_object('estoque', v_sec);
    end if;
  exception when others then
    v_out := v_out || jsonb_build_object('estoque', jsonb_build_object('erro', sqlerrm));
  end;

  return v_out;
end;
$fn$;

revoke all on function public.ai_assistant_snapshot(uuid, date) from public, anon;
grant execute on function public.ai_assistant_snapshot(uuid, date) to authenticated;
