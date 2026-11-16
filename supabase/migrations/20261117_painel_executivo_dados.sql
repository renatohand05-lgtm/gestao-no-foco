-- Painel Executivo: coluna de categoria operacional da OS + função que monta o conjunto de dados "realizados"
-- (OS, despesas, clientes, serviços, mecânicos, DRE base, fluxo, notas) a partir das tabelas operacionais.
-- Roda com os privilégios do usuário (RLS) e ainda exige vínculo em tenant_members.

alter table public.ordens_servico add column if not exists categoria_operacional text;

create or replace function public.painel_executivo_dados(p_tenant uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $fn$
declare
  v_ref date := (now() at time zone 'America/Sao_Paulo')::date;
  v_year int := extract(year from (now() at time zone 'America/Sao_Paulo'))::int;
  v_out jsonb;
begin
  if not exists (
    select 1 from public.tenant_members tm where tm.tenant_id = p_tenant and tm.user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with itens as (
    select i.ordem_servico_id oid,
           sum(i.valor_total) filter (where coalesce(i.categoria_item, '') <> 'peca') mo,
           sum(i.valor_total) filter (where i.categoria_item = 'peca') pc,
           sum(coalesce(i.custo_unitario, 0) * coalesce(i.quantidade, 1)) filter (where i.categoria_item = 'peca') custo,
           (array_agg(i.descricao order by i.ordem nulls last, i.created_at) filter (where coalesce(i.categoria_item, '') <> 'peca'))[1] serv
    from public.ordem_servico_itens i
    where i.tenant_id = p_tenant and i.deleted_at is null
    group by 1
  ),
  osb as (
    select o.id, o.numero, o.cliente_id,
           coalesce(o.data_conclusao, o.data_abertura)::date d,
           'OS-' || lpad(o.numero::text, 6, '0') cod,
           coalesce(c.nome, 'Cliente não informado') cli,
           coalesce(nullif(ve.placa, ''), 'Não informado') placa,
           coalesce(nullif(trim(coalesce(ve.marca, '') || ' ' || coalesce(ve.modelo, '')), ''), 'Veículo não informado') veic,
           coalesce(m.nome, '') mec,
           coalesce(nullif(it.serv, ''), 'Serviço personalizado') serv,
           coalesce(o.categoria_operacional, 'Outros') cat,
           vd.forma_pagamento fp,
           case when it.oid is null then o.valor_total else coalesce(it.mo, 0) end mo,
           coalesce(it.pc, 0) pc,
           coalesce(o.desconto_total, 0) descv,
           o.valor_total tot,
           coalesce(it.custo, 0) custo
    from public.ordens_servico o
    left join public.clientes c on c.id = o.cliente_id
    left join public.veiculos ve on ve.id = o.veiculo_id
    left join public.vendas vd on vd.id = o.venda_id
    left join itens it on it.oid = o.id
    left join lateral (
      select mc.nome_completo nome
      from public.ordem_servico_mecanicos osm
      join public.mecanicos mc on mc.id = osm.mecanico_id
      where osm.ordem_servico_id = o.id and coalesce(osm.ativo, true)
      order by osm.created_at limit 1
    ) m on true
    where o.tenant_id = p_tenant and o.deleted_at is null and o.status = 'faturado'
  ),
  desp as (
    select cp.data_competencia::date d,
           coalesce(nullif(cp.descricao, ''), cf.nome, 'Despesa') descr,
           cf.nome cat,
           case
             when cf.nome ilike 'sal%' or cf.nome ilike 'pr_-labore%' or cf.nome ilike 'comiss%' then 'Pessoal'
             when cf.nome ilike 'aluguel%' or cf.nome ilike 'energia%' or cf.nome ilike '_gua%' or cf.nome ilike 'internet%' or cf.nome ilike 'contabil%' then 'Fixo'
             when cf.nome ilike 'material%' or cf.nome ilike 'fornecedor%' or cf.nome ilike 'taxa%' then 'Variável'
             when cf.nome ilike 'investimento%' then 'Investimento'
             else 'Outros'
           end tipo,
           cp.valor_original v,
           case when cp.status = 'pago' then 'Sim' else 'Não' end pago,
           (cf.nome ilike 'impost%') is_tax
    from public.contas_pagar cp
    left join public.categorias_financeiras cf on cf.id = cp.categoria_financeira_id
    where cp.tenant_id = p_tenant and cp.deleted_at is null and coalesce(cp.status, '') <> 'cancelado'
  ),
  vis as (
    select cliente_id, count(*) n, sum(tot) tot, min(d) pri, max(d) ult from osb group by 1
  ),
  cli as (
    select c.id, c.nome, c.telefone, vs.n, vs.tot, vs.pri, vs.ult,
           lu.veic, lu.placa
    from public.clientes c
    left join vis vs on vs.cliente_id = c.id
    left join lateral (select b.veic, b.placa from osb b where b.cliente_id = c.id order by b.d desc, b.numero desc limit 1) lu on true
    where c.tenant_id = p_tenant and c.deleted_at is null and c.nome not ilike 'cliente n_o informado'
  ),
  meses as (
    select gs m from generate_series(1, 12) gs
  ),
  mfat as (select extract(month from d)::int m, sum(tot) fat, sum(tot - custo) lb from osb where extract(year from d) = v_year group by 1),
  mdesp as (select extract(month from d)::int m, sum(v) filter (where not is_tax) desp, sum(v) filter (where is_tax) imp from desp where extract(year from d) = v_year group by 1)
  select jsonb_build_object(
    'os', coalesce((select jsonb_agg(jsonb_build_array(d::text, cod, cli, placa, veic, mec, serv, cat, 'Finalizada', fp, mo, pc, descv, tot, custo, tot - custo, 0) order by d, numero) from osb), '[]'::jsonb),
    'desp', coalesce((select jsonb_agg(jsonb_build_array(d::text, descr, tipo, cat, v, null, pago) order by d, v desc) from desp where not is_tax), '[]'::jsonb),
    'cli', coalesce((select jsonb_agg(jsonb_build_array(
        nome, telefone, null, null, null, coalesce(n, 0), coalesce(tot, 0), case when coalesce(n, 0) > 0 then round(tot / n, 2) end,
        pri::text, ult::text, case when ult is not null then v_ref - ult end,
        case when ult is null then 'Sem visitas' when v_ref - ult <= 180 then 'Ativo' when v_ref - ult <= 365 then 'Em risco' else 'Inativo' end,
        veic, placa, (ult + 180)::text, null, null, null) order by tot desc nulls last) from cli), '[]'::jsonb),
    'veic', coalesce((select jsonb_agg(jsonb_build_array(ve.placa, c.nome, trim(coalesce(ve.marca, '') || ' ' || coalesce(ve.modelo, '')), null, null, null, null))
        from public.veiculos ve left join public.clientes c on c.id = ve.cliente_id where ve.tenant_id = p_tenant and ve.deleted_at is null), '[]'::jsonb),
    'serv', coalesce((select jsonb_agg(jsonb_build_array(
        coalesce(p.codigo_interno, 'S' || lpad(p.rn::text, 3, '0')), p.nome, p.categoria, coalesce(p.preco_venda, 0), coalesce(p.custo, 0),
        case when p.tempo_estimado_minutos is not null then p.tempo_estimado_minutos || ' min' end,
        case when p.ativo then 'Sim' else 'Não' end, p.observacoes, 0, 0) order by p.rn)
        from (select pr.*, row_number() over (order by pr.created_at, pr.nome) rn from public.produtos pr
              where pr.tenant_id = p_tenant and pr.tipo = 'servico' and pr.deleted_at is null) p), '[]'::jsonb),
    'mecs', coalesce((select jsonb_agg(jsonb_build_array(mc.nome_completo, nullif(upper(coalesce(mc.funcao, mc.nivel)), '')) order by mc.nome_completo)
        from public.mecanicos mc where mc.tenant_id = p_tenant and mc.deleted_at is null), '[]'::jsonb),
    'dreBase', (select jsonb_agg(jsonb_build_array(
        (array['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])[ms.m], null, null,
        coalesce(f.fat, 0), coalesce(dd.desp, 0), coalesce(dd.imp, 0), ms.m, null) order by ms.m)
        from meses ms left join mfat f on f.m = ms.m left join mdesp dd on dd.m = ms.m),
    'fluxo', (select jsonb_agg(jsonb_build_array(
        make_date(v_year, ms.m, 1)::text, coalesce(f.fat, 0), coalesce(dd.desp, 0), coalesce(f.fat, 0) - coalesce(dd.desp, 0),
        coalesce(f.lb, 0) - coalesce(dd.desp, 0), null, null, null, '—') order by ms.m)
        from meses ms left join mfat f on f.m = ms.m left join mdesp dd on dd.m = ms.m),
    'notas', coalesce((select jsonb_agg(jsonb_build_array(n.data::text, n.nota, n.fornecedor, n.peca, n.os_ref, n.quantidade, n.unidade, n.total, n.receita) order by n.data, n.nota)
        from public.painel_notas_pecas n where n.tenant_id = p_tenant and n.deleted_at is null), '[]'::jsonb),
    'ref', 'Atualizado: ' || to_char(v_ref, 'DD/MM/YYYY')
  ) into v_out;

  return v_out;
end;
$fn$;

revoke all on function public.painel_executivo_dados(uuid) from public, anon;
grant execute on function public.painel_executivo_dados(uuid) to authenticated;
