-- Metas × realizado mês a mês (portal e Painel Executivo usam a mesma fonte).
-- Meta  = metas_vendas_mensais (meta geral, sem centro de custo) — a mesma que o Dashboard e a tela de Metas usam.
-- Realizado = OS faturadas (valor_total) na data de conclusão (ou abertura), igual ao Painel Executivo.
-- Roda com os privilégios do usuário (RLS) e exige vínculo em tenant_members.

create or replace function public.metas_realizado_mensal(p_tenant uuid, p_de date, p_ate date)
returns table (mes_ref date, meta_valor numeric, realizado_valor numeric, carros_qtd integer)
language plpgsql
stable
security invoker
set search_path = public
as $fn$
begin
  if not exists (
    select 1 from public.tenant_members tm where tm.tenant_id = p_tenant and tm.user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  with meses as (
    select gs::date m
    from generate_series(
      date_trunc('month', p_de)::date,
      date_trunc('month', p_ate)::date,
      interval '1 month'
    ) gs
  ),
  mt as (
    select mm.competencia c, sum(mm.valor_meta) v
    from public.metas_vendas_mensais mm
    where mm.tenant_id = p_tenant and mm.deleted_at is null and mm.centro_custo_id is null
    group by 1
  ),
  rl as (
    select date_trunc('month', coalesce(o.data_conclusao, o.data_abertura)::date)::date c,
           sum(o.valor_total) v, count(*)::int n
    from public.ordens_servico o
    where o.tenant_id = p_tenant and o.deleted_at is null and o.status = 'faturado'
    group by 1
  )
  select ms.m, mt.v, coalesce(rl.v, 0), coalesce(rl.n, 0)
  from meses ms
  left join mt on mt.c = ms.m
  left join rl on rl.c = ms.m
  order by ms.m;
end;
$fn$;

revoke all on function public.metas_realizado_mensal(uuid, date, date) from public, anon;
grant execute on function public.metas_realizado_mensal(uuid, date, date) to authenticated;
