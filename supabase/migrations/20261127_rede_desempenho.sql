-- Rede de lojas — R20: ajustes de desempenho e segurança apontados pelos avisos do Supabase.
--
-- 1) Índices de cobertura das chaves estrangeiras compostas (tenant_id, loja_id) das tabelas rede_*:
--    sem eles, excluir ou conferir uma loja varre a tabela inteira. Só índices novos; nenhum dado é alterado.
-- 2) Política rede_acessos_select: auth.uid() passa a ser avaliado uma vez por consulta, e não por linha
--    ((select auth.uid())). Mesma regra de acesso de antes: a própria linha do usuário ou administrador da empresa.
-- 3) set_updated_at: search_path fixo e vazio (a função só usa now(), que é do pg_catalog). Vale para todos os
--    gatilhos que a usam; o comportamento não muda.
--
-- Aditiva e reversível (drop index / recriar a política / alter function ... reset search_path).

create index if not exists rede_cmv_itens_tenant_loja_idx on public.rede_cmv_itens (tenant_id, loja_id);
create index if not exists rede_cmv_semanal_tenant_loja_idx on public.rede_cmv_semanal (tenant_id, loja_id);
create index if not exists rede_delivery_registros_tenant_loja_idx on public.rede_delivery_registros (tenant_id, loja_id);
create index if not exists rede_dre_lancamentos_tenant_loja_idx on public.rede_dre_lancamentos (tenant_id, loja_id);
create index if not exists rede_dre_premissas_tenant_loja_idx on public.rede_dre_premissas (tenant_id, loja_id);
create index if not exists rede_expansao_unidades_tenant_cenario_idx on public.rede_expansao_unidades (tenant_id, cenario_id);
create index if not exists rede_expansao_unidades_tenant_loja_idx on public.rede_expansao_unidades (tenant_id, loja_id);
create index if not exists rede_indicadores_mes_tenant_loja_idx on public.rede_indicadores_mes (tenant_id, loja_id);
create index if not exists rede_metas_tenant_loja_idx on public.rede_metas (tenant_id, loja_id);
create index if not exists rede_metas_faturamento_tenant_loja_idx on public.rede_metas_faturamento (tenant_id, loja_id);
create index if not exists rede_rupturas_tenant_loja_idx on public.rede_rupturas (tenant_id, loja_id);
create index if not exists rede_vendas_dia_tenant_loja_idx on public.rede_vendas_dia (tenant_id, loja_id);
create index if not exists rede_vendas_hora_mes_tenant_loja_idx on public.rede_vendas_hora_mes (tenant_id, loja_id);

drop policy if exists rede_acessos_select on public.rede_acessos;
create policy rede_acessos_select on public.rede_acessos
  for select to authenticated
  using ((user_id = (select auth.uid())) or public.is_tenant_admin(tenant_id));

alter function public.set_updated_at() set search_path = '';
