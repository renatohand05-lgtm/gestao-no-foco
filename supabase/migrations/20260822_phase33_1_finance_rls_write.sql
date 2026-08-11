-- Sprint 33.1 — RLS financeiro: SELECT = membro do tenant; WRITE = owner|admin|manager ativo.
-- Idempotente. Não destrói dados. Não altera FKs.
-- Aplicar MANUALMENTE no SQL Editor após snapshot (docs/architecture/MIGRATIONS.md).
-- Rollback: recriar policies "for all" membership-only (não recomendado).

create or replace function public.can_read_finance(p_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and (tm.status is null or tm.status = 'active')
  );
$$;

comment on function public.can_read_finance(uuid) is
  'Sprint 33.1 — membro ativo do tenant (SELECT financeiro). SECURITY DEFINER evita recursão RLS.';

create or replace function public.can_write_finance(p_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner', 'admin', 'manager')
      and (tm.status is null or tm.status = 'active')
  );
$$;

comment on function public.can_write_finance(uuid) is
  'Sprint 33.1 — escrita financeira: membership owner|admin|manager (RBAC real). member/visualizacao = somente leitura.';

grant execute on function public.can_read_finance(uuid) to authenticated;
grant execute on function public.can_write_finance(uuid) to authenticated;
revoke all on function public.can_read_finance(uuid) from public, anon;
revoke all on function public.can_write_finance(uuid) from public, anon;

-- Aplica SELECT (membro) + INSERT/UPDATE/DELETE (write) numa tabela com tenant_id.
-- p_legacy_names: policies antigas "for all" a remover.
create or replace function public._gof_apply_finance_rls_table(
  p_table text,
  p_legacy_names text[]
)
returns void
language plpgsql
as $$
declare
  pol text;
begin
  if to_regclass('public.' || p_table) is null then
    return;
  end if;

  execute format('alter table public.%I enable row level security', p_table);

  foreach pol in array p_legacy_names
  loop
    execute format('drop policy if exists %I on public.%I', pol, p_table);
  end loop;

  execute format('drop policy if exists %I on public.%I', p_table || '_select_member', p_table);
  execute format('drop policy if exists %I on public.%I', p_table || '_insert_write', p_table);
  execute format('drop policy if exists %I on public.%I', p_table || '_update_write', p_table);
  execute format('drop policy if exists %I on public.%I', p_table || '_delete_write', p_table);

  execute format(
    'create policy %I on public.%I for select using (public.can_read_finance(tenant_id))',
    p_table || '_select_member',
    p_table
  );
  execute format(
    'create policy %I on public.%I for insert with check (public.can_write_finance(tenant_id))',
    p_table || '_insert_write',
    p_table
  );
  execute format(
    'create policy %I on public.%I for update using (public.can_write_finance(tenant_id)) with check (public.can_write_finance(tenant_id))',
    p_table || '_update_write',
    p_table
  );
  execute format(
    'create policy %I on public.%I for delete using (public.can_write_finance(tenant_id))',
    p_table || '_delete_write',
    p_table
  );
end;
$$;

select public._gof_apply_finance_rls_table('contas_pagar', array['Membros gerenciam contas a pagar da empresa']);
select public._gof_apply_finance_rls_table('contas_receber', array['Membros gerenciam contas a receber da empresa']);
select public._gof_apply_finance_rls_table('contas_bancarias', array['Membros gerenciam contas bancarias da empresa']);
select public._gof_apply_finance_rls_table('movimentacoes_bancarias', array['Membros gerenciam movimentacoes bancarias da empresa']);
select public._gof_apply_finance_rls_table('categorias_financeiras', array['Membros gerenciam categorias financeiras da empresa']);
select public._gof_apply_finance_rls_table('centros_custo', array['Membros gerenciam centros de custo da empresa']);
select public._gof_apply_finance_rls_table('plano_contas', array['Membros gerenciam plano de contas da empresa']);
select public._gof_apply_finance_rls_table('formas_pagamento', array['Membros gerenciam formas de pagamento da empresa']);
select public._gof_apply_finance_rls_table('contas_pagar_rateios', array['Membros gerenciam rateios do tenant']);
select public._gof_apply_finance_rls_table('despesas_recorrentes', array['Membros gerenciam recorrencias do tenant']);
select public._gof_apply_finance_rls_table('finance_budgets', array['finance_budgets_tenant_all']);
select public._gof_apply_finance_rls_table('finance_budget_lines', array['finance_budget_lines_tenant_all']);
select public._gof_apply_finance_rls_table('centros_resultado', array['centros_resultado_tenant_all']);

do $$
begin
  if to_regclass('public.financeiro_lancamento_eventos') is not null then
    perform public._gof_apply_finance_rls_table(
      'financeiro_lancamento_eventos',
      array['Membros leem eventos do tenant', 'Membros inserem eventos do tenant']
    );
  end if;
end $$;

drop function if exists public._gof_apply_finance_rls_table(text, text[]);
