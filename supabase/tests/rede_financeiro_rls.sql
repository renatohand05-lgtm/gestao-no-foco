-- Rede de lojas, rodada 15 — teste das regras do banco (RLS, restrições, cascatas) por perfil.
--
-- COMO USAR: cole no SQL Editor do Supabase (ou rode por psql) e execute. O teste NÃO deixa nada para trás:
-- ele cria dados de teste, simula cada perfil (consultor, diretoria, gerente regional, gerente de loja,
-- sem acesso, dono) e termina de propósito com um erro (RAISE EXCEPTION), o que desfaz tudo.
-- O resultado aparece na mensagem desse erro: "RLS_FINANCEIRO_OK ..." = tudo certo;
-- "RLS_FINANCEIRO_FALHAS ..." = lista o que falhou.
--
-- Pré-requisito: as empresas 'fat-buddha-demo' (com os dados de exemplo da rodada 15) e 'fat-buddha'
-- existem, e a empresa de demonstração tem ao menos um membro. Usa esse membro como "a pessoa" de cada perfil.

create temp table if not exists res (nome text, ok boolean, detalhe text) on commit drop;
truncate res;

-- Executa um comando SQL como a pessoa `p_user` com o papel "authenticated" (RLS valendo).
create or replace function pg_temp.como(p_user uuid, p_sql text) returns text language plpgsql as $f$
declare n int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  set local role authenticated;
  begin
    execute p_sql;
    get diagnostics n = row_count;
    reset role;
    return 'ok:' || n;
  exception when others then
    reset role;
    return 'erro:' || sqlstate;
  end;
end $f$;

-- Idem, como visitante sem login (papel "anon").
create or replace function pg_temp.como_anon(p_sql text) returns text language plpgsql as $f$
declare n int;
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
  begin
    execute p_sql;
    get diagnostics n = row_count;
    reset role;
    return 'ok:' || n;
  exception when others then
    reset role;
    return 'erro:' || sqlstate;
  end;
end $f$;

create or replace function pg_temp.chk(p_nome text, p_obtido text, p_esperado text) returns void language plpgsql as $f$
begin
  insert into res values (p_nome, p_obtido is not distinct from p_esperado, case when p_obtido is not distinct from p_esperado then null else 'obtido ' || coalesce(p_obtido, 'null') || ', esperado ' || p_esperado end);
end $f$;

-- Roda `p_sql` como a pessoa do cenário `p_i` e confere com o esperado daquele cenário.
create or replace function pg_temp.t(p_nome text, p_i int, p_sql text, p_esp text[]) returns void language plpgsql as $f$
begin
  perform pg_temp.chk('[' || (array['consultor','diretoria','gerente regional','gerente de loja','sem acesso','dono'])[p_i + 1] || '] ' || p_nome,
    pg_temp.como(current_setting('t.u')::uuid, p_sql), p_esp[p_i + 1]);
end $f$;

do $test$
declare
  u uuid;
  ta uuid; tb uuid;
  a_bro uuid; a_per uuid; a_vil uuid; a_tat uuid; b_bro uuid;
  i int;
  wk date; alvo date; alvo2 date;
  n_cmv bigint; n_itens bigint; n_prem bigint; n_lanc bigint; n_cen bigint; n_uni bigint; n_cfg bigint; n_cmv_reg bigint; n_cmv_loja bigint;
  meta0 int;
  cen_b uuid;
  h0 bigint; h1 bigint;
  falhas text; total int; ruins int;
  r text;
begin
  select id into ta from public.tenants where slug = 'fat-buddha-demo';
  select id into tb from public.tenants where slug = 'fat-buddha';
  select user_id into u from public.tenant_members where tenant_id = ta order by created_at limit 1;
  if ta is null or tb is null or u is null then raise exception 'Pré-requisito ausente: empresas fat-buddha-demo/fat-buddha ou um membro.'; end if;
  perform set_config('t.u', u::text, true);
  select id into a_bro from public.rede_lojas where tenant_id = ta and slug = 'brooklyn';
  select id into a_per from public.rede_lojas where tenant_id = ta and slug = 'perdizes';
  select id into a_vil from public.rede_lojas where tenant_id = ta and slug = 'vila-mariana';
  select id into a_tat from public.rede_lojas where tenant_id = ta and slug = 'tatuape';
  select id into b_bro from public.rede_lojas where tenant_id = tb and slug = 'brooklyn';

  -- Dados de teste que valem para todos os cenários (lançamentos reais do DRE nas duas empresas).
  insert into public.rede_dre_lancamentos (tenant_id, loja_id, mes, linha, valor) values
    (ta, a_bro, date '2026-10-01', 'cmv', 1000), (ta, a_tat, date '2026-10-01', 'folha', 2000), (tb, b_bro, date '2026-10-01', 'cmv', 777);
  select meta_lojas into meta0 from public.rede_expansao_config where tenant_id = ta;
  select id into cen_b from public.rede_orc_cenarios where tenant_id = tb limit 1;

  -- Contagens esperadas (empresa de demonstração), calculadas como dono do banco.
  select count(*) into n_cmv from public.rede_cmv_semanal where tenant_id = ta;
  select count(*) into n_cmv_reg from public.rede_cmv_semanal where loja_id in (a_bro, a_per);
  select count(*) into n_cmv_loja from public.rede_cmv_semanal where loja_id = a_bro;
  select count(*) into n_itens from public.rede_cmv_itens where tenant_id = ta;
  select count(*) into n_prem from public.rede_dre_premissas where tenant_id = ta;
  select count(*) into n_lanc from public.rede_dre_lancamentos where tenant_id = ta;
  select count(*) into n_cen from public.rede_orc_cenarios where tenant_id = ta;
  select count(*) into n_uni from public.rede_expansao_unidades where tenant_id = ta;
  select count(*) into n_cfg from public.rede_expansao_config where tenant_id = ta;
  perform pg_temp.chk('preparo: há contagens de exemplo na demonstração', case when n_cmv > 0 and n_itens > 0 and n_cen > 0 and n_uni > 0 and n_cfg = 1 and n_prem > 0 then 'sim' else 'não' end, 'sim');

  for i in 0..5 loop
    wk := date '2027-01-04' + 7 * i;       -- segundas-feiras diferentes por cenário (nunca colidem)
    alvo := date '2027-03-01' + 7 * i;
    alvo2 := date '2027-05-03' + 7 * i;

    -- Quem é a pessoa neste cenário.
    delete from public.rede_acessos where tenant_id in (ta, tb) and user_id = u;
    update public.tenant_members set role = 'member' where user_id = u and tenant_id in (ta, tb);
    if i = 0 then insert into public.rede_acessos (tenant_id, user_id, papel, todas_lojas) values (ta, u, 'consultor', true);
    elsif i = 1 then insert into public.rede_acessos (tenant_id, user_id, papel, todas_lojas) values (ta, u, 'diretoria', true);
    elsif i = 2 then insert into public.rede_acessos (tenant_id, user_id, papel, todas_lojas, loja_ids) values (ta, u, 'gerente_regional', false, array[a_bro, a_per]);
    elsif i = 3 then insert into public.rede_acessos (tenant_id, user_id, papel, todas_lojas, loja_ids) values (ta, u, 'gerente_loja', false, array[a_bro]);
    elsif i = 5 then update public.tenant_members set role = 'owner' where user_id = u and tenant_id = ta;
    end if;

    -- ---------------------------------------------------------------- leitura
    perform pg_temp.t('lê CMV', i, 'select 1 from public.rede_cmv_semanal', array['ok:' || n_cmv, 'ok:' || n_cmv, 'ok:' || n_cmv_reg, 'ok:' || n_cmv_loja, 'ok:0', 'ok:' || n_cmv]);
    perform pg_temp.t('lê itens do CMV', i, 'select 1 from public.rede_cmv_itens', array['ok:' || n_itens, 'ok:' || n_itens, 'ok:' || n_itens, 'ok:' || n_itens, 'ok:0', 'ok:' || n_itens]);
    perform pg_temp.t('lê premissas do DRE', i, 'select 1 from public.rede_dre_premissas', array['ok:' || n_prem, 'ok:' || n_prem, 'ok:0', 'ok:0', 'ok:0', 'ok:' || n_prem]);
    perform pg_temp.t('lê lançamentos do DRE', i, 'select 1 from public.rede_dre_lancamentos', array['ok:' || n_lanc, 'ok:' || n_lanc, 'ok:0', 'ok:0', 'ok:0', 'ok:' || n_lanc]);
    perform pg_temp.t('lê cenários', i, 'select 1 from public.rede_orc_cenarios', array['ok:' || n_cen, 'ok:' || n_cen, 'ok:0', 'ok:0', 'ok:0', 'ok:' || n_cen]);
    perform pg_temp.t('lê inaugurações', i, 'select 1 from public.rede_expansao_unidades', array['ok:' || n_uni, 'ok:' || n_uni, 'ok:0', 'ok:0', 'ok:0', 'ok:' || n_uni]);
    perform pg_temp.t('lê configuração da expansão', i, 'select 1 from public.rede_expansao_config', array['ok:' || n_cfg, 'ok:' || n_cfg, 'ok:0', 'ok:0', 'ok:0', 'ok:' || n_cfg]);
    -- nenhum cenário enxerga a outra empresa
    for r in select unnest(array['rede_cmv_semanal', 'rede_cmv_itens', 'rede_dre_premissas', 'rede_dre_lancamentos', 'rede_orc_cenarios', 'rede_expansao_unidades', 'rede_expansao_config']) loop
      perform pg_temp.t('não vê a outra empresa em ' || r, i, format('select 1 from public.%I where tenant_id = %L', r, tb), array['ok:0','ok:0','ok:0','ok:0','ok:0','ok:0']);
    end loop;

    -- ---------------------------------------------------------------- preparo (como dono do banco)
    insert into public.rede_cmv_semanal (tenant_id, loja_id, semana, cmv_teorico, estoque_inicial, compras, estoque_final)
      select ta, l, d, 20, 100, 100, 100 from unnest(array[a_bro, a_per, a_vil]) l, unnest(array[alvo, alvo2]) d;
    insert into public.rede_cmv_itens (tenant_id, loja_id, semana, item, consumo_teorico, consumo_real) values (ta, a_bro, alvo, 'Pre', 1, 1);
    insert into public.rede_dre_lancamentos (tenant_id, loja_id, mes, linha, valor) values (ta, a_bro, date '2025-03-01', 'cmv', 1), (ta, a_tat, date '2025-03-01', 'cmv', 1);
    insert into public.rede_dre_premissas (tenant_id, loja_id, custo_delivery) values (ta, a_per, 26);
    insert into public.rede_orc_cenarios (tenant_id, nome, faturamento, mix_delivery, cmv, folha, impostos, custo_delivery, manutencao, marketing, cto, agua, energia, curva)
      values (ta, 'Alvo ' || i, 1000, 100, 20, 20, 10, 28, 1, 1, 0, 0, 0, '[100]'::jsonb);
    insert into public.rede_expansao_unidades (tenant_id, nome) values (ta, 'Alvo u' || i);

    -- ---------------------------------------------------------------- CMV
    perform pg_temp.t('grava CMV na loja própria (Brooklyn)', i, format($q$insert into public.rede_cmv_semanal (tenant_id, loja_id, semana, cmv_teorico, estoque_inicial, compras, estoque_final) values (%L, %L, %L, 20, 100, 100, 100)$q$, ta, a_bro, wk), array['ok:1','erro:42501','ok:1','ok:1','erro:42501','ok:1']);
    perform pg_temp.t('grava CMV na Perdizes', i, format($q$insert into public.rede_cmv_semanal (tenant_id, loja_id, semana, cmv_teorico, estoque_inicial, compras, estoque_final) values (%L, %L, %L, 20, 100, 100, 100)$q$, ta, a_per, wk), array['ok:1','erro:42501','ok:1','erro:42501','erro:42501','ok:1']);
    perform pg_temp.t('grava CMV na Vila Mariana', i, format($q$insert into public.rede_cmv_semanal (tenant_id, loja_id, semana, cmv_teorico, estoque_inicial, compras, estoque_final) values (%L, %L, %L, 20, 100, 100, 100)$q$, ta, a_vil, wk), array['ok:1','erro:42501','erro:42501','erro:42501','erro:42501','ok:1']);
    perform pg_temp.t('grava CMV em loja de outra empresa', i, format($q$insert into public.rede_cmv_semanal (tenant_id, loja_id, semana, cmv_teorico, estoque_inicial, compras, estoque_final) values (%L, %L, %L, 20, 100, 100, 100)$q$, tb, b_bro, wk), array['erro:42501','erro:42501','erro:42501','erro:42501','erro:42501','erro:42501']);
    perform pg_temp.t('grava CMV misturando empresa e loja', i, format($q$insert into public.rede_cmv_semanal (tenant_id, loja_id, semana, cmv_teorico, estoque_inicial, compras, estoque_final) values (%L, %L, %L, 20, 100, 100, 100)$q$, ta, b_bro, wk + 1 - 1), array['erro:42501','erro:42501','erro:42501','erro:42501','erro:42501','erro:42501']);
    perform pg_temp.t('corrige CMV da loja própria', i, format($q$update public.rede_cmv_semanal set responsavel = 'x' where loja_id = %L and semana = %L$q$, a_bro, alvo), array['ok:1','ok:0','ok:1','ok:1','ok:0','ok:1']);
    perform pg_temp.t('corrige CMV da Vila Mariana', i, format($q$update public.rede_cmv_semanal set responsavel = 'x' where loja_id = %L and semana = %L$q$, a_vil, alvo), array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1']);
    perform pg_temp.t('move CMV para loja de outra empresa', i, format($q$update public.rede_cmv_semanal set loja_id = %L where loja_id = %L and semana = %L$q$, b_bro, a_bro, alvo), array['erro:42501','ok:0','erro:42501','erro:42501','ok:0','erro:42501']);
    perform pg_temp.t('exclui CMV da Perdizes', i, format($q$delete from public.rede_cmv_semanal where loja_id = %L and semana = %L$q$, a_per, alvo), array['ok:1','ok:0','ok:1','ok:0','ok:0','ok:1']);
    perform pg_temp.t('exclui CMV da loja própria (apaga os itens junto)', i, format($q$delete from public.rede_cmv_semanal where loja_id = %L and semana = %L$q$, a_bro, alvo), array['ok:1','ok:0','ok:1','ok:1','ok:0','ok:1']);
    perform pg_temp.t('grava item na loja própria', i, format($q$insert into public.rede_cmv_itens (tenant_id, loja_id, semana, item, consumo_teorico, consumo_real) values (%L, %L, %L, 'Teste', 1, 1)$q$, ta, a_bro, alvo2), array['ok:1','erro:42501','ok:1','ok:1','erro:42501','ok:1']);
    perform pg_temp.t('grava item na Vila Mariana', i, format($q$insert into public.rede_cmv_itens (tenant_id, loja_id, semana, item, consumo_teorico, consumo_real) values (%L, %L, %L, 'Teste', 1, 1)$q$, ta, a_vil, alvo2), array['ok:1','erro:42501','erro:42501','erro:42501','erro:42501','ok:1']);

    -- ---------------------------------------------------------------- DRE
    perform pg_temp.t('lança despesa real da loja', i, format($q$insert into public.rede_dre_lancamentos (tenant_id, loja_id, mes, linha, valor) values (%L, %L, %L, 'agua', 10)$q$, ta, a_bro, (date '2025-06-01' + i * interval '1 month')::date), array['ok:1','erro:42501','erro:42501','erro:42501','erro:42501','ok:1']);
    perform pg_temp.t('lança despesa em loja de outra empresa', i, format($q$insert into public.rede_dre_lancamentos (tenant_id, loja_id, mes, linha, valor) values (%L, %L, date '2025-06-01', 'agua', 10)$q$, tb, b_bro), array['erro:42501','erro:42501','erro:42501','erro:42501','erro:42501','erro:42501']);
    perform pg_temp.t('corrige lançamento', i, format($q$update public.rede_dre_lancamentos set valor = 5 where loja_id = %L and mes = date '2025-03-01'$q$, a_bro), array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1']);
    perform pg_temp.t('exclui lançamento', i, format($q$delete from public.rede_dre_lancamentos where loja_id = %L and mes = date '2025-03-01'$q$, a_tat), array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1']);
    perform pg_temp.t('altera o padrão da rede', i, format($q$update public.rede_dre_premissas set cmv = 22 where tenant_id = %L and loja_id is null$q$, ta), array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1']);
    perform pg_temp.t('ninguém exclui o padrão da rede', i, format($q$delete from public.rede_dre_premissas where tenant_id = %L and loja_id is null$q$, ta), array['ok:0','ok:0','ok:0','ok:0','ok:0','ok:0']);
    perform pg_temp.t('altera exceção da Vila Mariana', i, format($q$update public.rede_dre_premissas set custo_delivery = 26 where loja_id = %L$q$, a_vil), array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1']);
    perform pg_temp.t('cria exceção para a Tatuapé', i, format($q$insert into public.rede_dre_premissas (tenant_id, loja_id, marketing) values (%L, %L, 6)$q$, ta, a_tat), array['ok:1','erro:42501','erro:42501','erro:42501','erro:42501','ok:1']);
    perform pg_temp.t('remove exceção da Perdizes', i, format($q$delete from public.rede_dre_premissas where loja_id = %L$q$, a_per), array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1']);

    -- ---------------------------------------------------------------- orçamento e expansão
    perform pg_temp.t('cria cenário', i, format($q$insert into public.rede_orc_cenarios (tenant_id, nome, faturamento, mix_delivery, cmv, folha, impostos, custo_delivery, manutencao, marketing, cto, agua, energia, curva) values (%L, %L, 1000, 100, 20, 20, 10, 28, 1, 1, 0, 0, 0, '[100]'::jsonb)$q$, ta, 'Teste ' || i), array['ok:1','erro:42501','erro:42501','erro:42501','erro:42501','ok:1']);
    perform pg_temp.t('cria cenário em outra empresa', i, format($q$insert into public.rede_orc_cenarios (tenant_id, nome, faturamento, mix_delivery, cmv, folha, impostos, custo_delivery, manutencao, marketing, cto, agua, energia, curva) values (%L, %L, 1000, 100, 20, 20, 10, 28, 1, 1, 0, 0, 0, '[100]'::jsonb)$q$, tb, 'Teste ' || i), array['erro:42501','erro:42501','erro:42501','erro:42501','erro:42501','erro:42501']);
    perform pg_temp.t('edita cenário', i, format($q$update public.rede_orc_cenarios set descricao = 'x' where tenant_id = %L and nome like 'Conservador%%'$q$, ta), array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1']);
    perform pg_temp.t('exclui cenário', i, format($q$delete from public.rede_orc_cenarios where tenant_id = %L and nome = %L$q$, ta, 'Alvo ' || i), array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1']);
    perform pg_temp.t('cria inauguração', i, format($q$insert into public.rede_expansao_unidades (tenant_id, nome) values (%L, %L)$q$, ta, 'Teste u' || i), array['ok:1','erro:42501','erro:42501','erro:42501','erro:42501','ok:1']);
    perform pg_temp.t('inauguração com cenário de outra empresa', i, format($q$insert into public.rede_expansao_unidades (tenant_id, nome, cenario_id) values (%L, %L, %L)$q$, ta, 'Teste x' || i, cen_b), array['erro:23503','erro:42501','erro:42501','erro:42501','erro:42501','erro:23503']);
    perform pg_temp.t('edita inauguração', i, format($q$update public.rede_expansao_unidades set observacao = 'x' where tenant_id = %L and nome = 'Loja 6'$q$, ta), array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1']);
    perform pg_temp.t('exclui inauguração', i, format($q$delete from public.rede_expansao_unidades where tenant_id = %L and nome = %L$q$, ta, 'Alvo u' || i), array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1']);
    perform pg_temp.t('altera a configuração da rede', i, format($q$update public.rede_expansao_config set meta_lojas = 12 where tenant_id = %L$q$, ta), array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1']);
    perform pg_temp.t('configuração com loja-base de outra empresa', i, format($q$update public.rede_expansao_config set lojas_base = array[%L]::uuid[] where tenant_id = %L$q$, b_bro, ta), array['erro:23514','ok:0','ok:0','ok:0','ok:0','erro:23514']);
    perform pg_temp.t('configuração duplicada', i, format($q$insert into public.rede_expansao_config (tenant_id) values (%L)$q$, ta), array['erro:23505','erro:42501','erro:42501','erro:42501','erro:42501','erro:23505']);
    perform pg_temp.t('altera configuração de outra empresa', i, format($q$update public.rede_expansao_config set meta_lojas = 99 where tenant_id = %L$q$, tb), array['ok:0','ok:0','ok:0','ok:0','ok:0','ok:0']);
    perform pg_temp.t('ninguém exclui a configuração', i, format($q$delete from public.rede_expansao_config where tenant_id = %L$q$, ta), array['ok:0','ok:0','ok:0','ok:0','ok:0','ok:0']);
    perform pg_temp.t('não executa a função interna de preparo', i, format($q$select public.rede_preparar_financeiro(%L)$q$, ta), array['erro:42501','erro:42501','erro:42501','erro:42501','erro:42501','erro:42501']);

    -- ---------------------------------------------------------------- restrições do banco (só uma vez: valem para qualquer perfil que grave)
    if i = 0 then
      perform pg_temp.t('CMV: começo de semana na terça é recusado', i, format($q$insert into public.rede_cmv_semanal (tenant_id, loja_id, semana, cmv_teorico, estoque_inicial, compras, estoque_final) values (%L, %L, %L, 20, 1, 1, 1)$q$, ta, a_tat, date '2027-06-01'), array['erro:23514','','','','','']);
      perform pg_temp.t('CMV: vendas zero é recusado', i, format($q$insert into public.rede_cmv_semanal (tenant_id, loja_id, semana, vendas, cmv_teorico, estoque_inicial, compras, estoque_final) values (%L, %L, %L, 0, 20, 1, 1, 1)$q$, ta, a_tat, date '2027-06-07'), array['erro:23514','','','','','']);
      perform pg_temp.t('CMV: teórico acima de 100% é recusado', i, format($q$insert into public.rede_cmv_semanal (tenant_id, loja_id, semana, cmv_teorico, estoque_inicial, compras, estoque_final) values (%L, %L, %L, 101, 1, 1, 1)$q$, ta, a_tat, date '2027-06-07'), array['erro:23514','','','','','']);
      perform pg_temp.t('CMV: estoque final negativo é recusado', i, format($q$insert into public.rede_cmv_semanal (tenant_id, loja_id, semana, cmv_teorico, estoque_inicial, compras, estoque_final) values (%L, %L, %L, 20, 1, 1, -1)$q$, ta, a_tat, date '2027-06-07'), array['erro:23514','','','','','']);
      perform pg_temp.t('CMV: mesma loja e semana duas vezes é recusado', i, format($q$insert into public.rede_cmv_semanal (tenant_id, loja_id, semana, cmv_teorico, estoque_inicial, compras, estoque_final) values (%L, %L, %L, 20, 1, 1, 1)$q$, ta, a_bro, alvo2), array['erro:23505','','','','','']);
      perform pg_temp.t('item: consumo teórico zero é recusado', i, format($q$insert into public.rede_cmv_itens (tenant_id, loja_id, semana, item, consumo_teorico, consumo_real) values (%L, %L, %L, 'Zero', 0, 1)$q$, ta, a_bro, alvo2), array['erro:23514','','','','','']);
      perform pg_temp.t('item: nome em branco é recusado', i, format($q$insert into public.rede_cmv_itens (tenant_id, loja_id, semana, item, consumo_teorico, consumo_real) values (%L, %L, %L, '  ', 1, 1)$q$, ta, a_bro, alvo2), array['erro:23514','','','','','']);
      perform pg_temp.t('item: repetido na contagem é recusado', i, format($q$insert into public.rede_cmv_itens (tenant_id, loja_id, semana, item, consumo_teorico, consumo_real) values (%L, %L, %L, 'Teste', 1, 1)$q$, ta, a_bro, alvo2), array['erro:23505','','','','','']);
      perform pg_temp.t('DRE: valor negativo é recusado', i, format($q$insert into public.rede_dre_lancamentos (tenant_id, loja_id, mes, linha, valor) values (%L, %L, date '2025-02-01', 'cmv', -1)$q$, ta, a_bro), array['erro:23514','','','','','']);
      perform pg_temp.t('DRE: mês que não começa no dia 1 é recusado', i, format($q$insert into public.rede_dre_lancamentos (tenant_id, loja_id, mes, linha, valor) values (%L, %L, date '2025-02-15', 'cmv', 1)$q$, ta, a_bro), array['erro:23514','','','','','']);
      perform pg_temp.t('DRE: linha inexistente é recusada', i, format($q$insert into public.rede_dre_lancamentos (tenant_id, loja_id, mes, linha, valor) values (%L, %L, date '2025-02-01', 'faturamento', 1)$q$, ta, a_bro), array['erro:23514','','','','','']);
      perform pg_temp.t('DRE: mesma loja, mês e linha duas vezes é recusado', i, format($q$insert into public.rede_dre_lancamentos (tenant_id, loja_id, mes, linha, valor) values (%L, %L, date '2026-10-01', 'cmv', 1)$q$, ta, a_bro), array['erro:23505','','','','','']);
      perform pg_temp.t('premissa: percentual acima de 100 é recusado', i, format($q$update public.rede_dre_premissas set cmv = 101 where loja_id = %L$q$, a_vil), array['erro:23514','','','','','']);
      perform pg_temp.t('premissa: base do delivery inválida é recusada', i, format($q$update public.rede_dre_premissas set base_delivery = 'x' where loja_id = %L$q$, a_vil), array['erro:23514','','','','','']);
      perform pg_temp.t('premissa: padrão da rede incompleto é recusado', i, format($q$insert into public.rede_dre_premissas (tenant_id, cmv) values (%L, 20)$q$, ta), array['erro:23514','','','','','']);
      perform pg_temp.t('cenário: curva com 13 meses é recusada', i, format($q$insert into public.rede_orc_cenarios (tenant_id, nome, faturamento, mix_delivery, cmv, folha, impostos, custo_delivery, manutencao, marketing, cto, agua, energia, curva) values (%L, 'Curva longa', 1000, 100, 20, 20, 10, 28, 1, 1, 0, 0, 0, '[1,2,3,4,5,6,7,8,9,10,11,12,13]'::jsonb)$q$, ta), array['erro:23514','','','','','']);
      perform pg_temp.t('cenário: faturamento zero é recusado', i, format($q$insert into public.rede_orc_cenarios (tenant_id, nome, faturamento, mix_delivery, cmv, folha, impostos, custo_delivery, manutencao, marketing, cto, agua, energia, curva) values (%L, 'Zero', 0, 100, 20, 20, 10, 28, 1, 1, 0, 0, 0, '[100]'::jsonb)$q$, ta), array['erro:23514','','','','','']);
      perform pg_temp.t('cenário: nome repetido é recusado', i, format($q$insert into public.rede_orc_cenarios (tenant_id, nome, faturamento, mix_delivery, cmv, folha, impostos, custo_delivery, manutencao, marketing, cto, agua, energia, curva) values (%L, 'Conservador (exemplo)', 1000, 100, 20, 20, 10, 28, 1, 1, 0, 0, 0, '[100]'::jsonb)$q$, ta), array['erro:23505','','','','','']);
      perform pg_temp.t('cenário: dois padrões na empresa é recusado', i, format($q$update public.rede_orc_cenarios set padrao = true where tenant_id = %L and nome = 'Conservador (exemplo)'$q$, ta), array['erro:23505','','','','','']);
      perform pg_temp.t('inauguração: data que não é dia 1 é recusada', i, format($q$insert into public.rede_expansao_unidades (tenant_id, nome, abertura_prevista) values (%L, 'Data torta', date '2027-03-15')$q$, ta), array['erro:23514','','','','','']);
      perform pg_temp.t('inauguração: situação inválida é recusada', i, format($q$insert into public.rede_expansao_unidades (tenant_id, nome, status) values (%L, 'Status torto', 'aberta')$q$, ta), array['erro:23514','','','','','']);
      perform pg_temp.t('inauguração: nome repetido é recusado', i, format($q$insert into public.rede_expansao_unidades (tenant_id, nome) values (%L, 'Loja 6')$q$, ta), array['erro:23505','','','','','']);
      perform pg_temp.t('configuração: meta de lojas 0 é recusada', i, format($q$update public.rede_expansao_config set meta_lojas = 0 where tenant_id = %L$q$, ta), array['erro:23514','','','','','']);
      select count(*) into h0 from public.rede_historico where tenant_id = ta and user_id = u;
      perform pg_temp.chk('histórico: o que a pessoa gravou ficou registrado com o nome dela', case when h0 > 0 then 'sim' else 'não' end, 'sim');
    end if;

    -- ---------------------------------------------------------------- limpeza do cenário
    delete from public.rede_cmv_semanal where semana >= date '2027-01-01';
    delete from public.rede_dre_lancamentos where mes < date '2026-01-01';
    delete from public.rede_dre_premissas where loja_id in (a_per, a_tat);
    delete from public.rede_orc_cenarios where nome like 'Teste%' or nome like 'Alvo%' or nome like 'Curva%' or nome = 'Zero';
    delete from public.rede_expansao_unidades where nome like 'Teste%' or nome like 'Alvo%';
    update public.rede_expansao_config set meta_lojas = meta0 where tenant_id = ta;
  end loop;

  -- ---------------------------------------------------------------- visitante sem login
  for r in select unnest(array['rede_cmv_semanal', 'rede_cmv_itens', 'rede_dre_premissas', 'rede_dre_lancamentos', 'rede_orc_cenarios', 'rede_expansao_unidades', 'rede_expansao_config']) loop
    perform pg_temp.chk('visitante sem login não lê ' || r, case when pg_temp.como_anon(format('select 1 from public.%I', r)) in ('ok:0', 'erro:42501') then 'barrado' else 'VAZOU' end, 'barrado');
    perform pg_temp.chk('visitante sem login não grava em ' || r, case when pg_temp.como_anon(format('delete from public.%I', r)) in ('ok:0', 'erro:42501') then 'barrado' else 'VAZOU' end, 'barrado');
  end loop;

  -- ---------------------------------------------------------------- integridade (como dono do banco)
  update public.tenant_members set role = 'owner' where user_id = u and tenant_id = ta;
  begin
    insert into public.rede_cmv_semanal (tenant_id, loja_id, semana, cmv_teorico, estoque_inicial, compras, estoque_final) values (ta, b_bro, date '2027-07-05', 20, 1, 1, 1);
    perform pg_temp.chk('integridade: contagem de loja de outra empresa', 'aceitou', 'recusou');
  exception when foreign_key_violation then perform pg_temp.chk('integridade: contagem de loja de outra empresa', 'recusou', 'recusou'); end;
  begin
    delete from public.rede_lojas where id = a_bro;
    perform pg_temp.chk('integridade: loja com contagens não pode ser excluída', 'excluiu', 'recusou');
  exception when foreign_key_violation then perform pg_temp.chk('integridade: loja com contagens não pode ser excluída', 'recusou', 'recusou'); end;
  -- itens acompanham a contagem (exclusão e mudança de semana)
  insert into public.rede_cmv_semanal (tenant_id, loja_id, semana, cmv_teorico, estoque_inicial, compras, estoque_final) values (ta, a_tat, date '2027-09-06', 20, 1, 1, 1);
  insert into public.rede_cmv_itens (tenant_id, loja_id, semana, item, consumo_teorico, consumo_real) values (ta, a_tat, date '2027-09-06', 'Sal', 1, 1);
  update public.rede_cmv_semanal set semana = date '2027-09-13' where loja_id = a_tat and semana = date '2027-09-06';
  perform pg_temp.chk('integridade: item acompanha a nova semana da contagem', (select count(*)::text from public.rede_cmv_itens where loja_id = a_tat and semana = date '2027-09-13'), '1');
  delete from public.rede_cmv_semanal where loja_id = a_tat and semana = date '2027-09-13';
  perform pg_temp.chk('integridade: excluir a contagem apaga os itens', (select count(*)::text from public.rede_cmv_itens where loja_id = a_tat and semana = date '2027-09-13'), '0');
  -- cenário excluído: a inauguração continua, sem cenário
  insert into public.rede_orc_cenarios (tenant_id, nome, faturamento, mix_delivery, cmv, folha, impostos, custo_delivery, manutencao, marketing, cto, agua, energia, curva) values (ta, 'Zeta', 1000, 100, 20, 20, 10, 28, 1, 1, 0, 0, 0, '[100]'::jsonb);
  insert into public.rede_expansao_unidades (tenant_id, nome, cenario_id) select ta, 'Usa Zeta', id from public.rede_orc_cenarios where tenant_id = ta and nome = 'Zeta';
  delete from public.rede_orc_cenarios where tenant_id = ta and nome = 'Zeta';
  perform pg_temp.chk('integridade: excluir cenário mantém a inauguração e limpa o vínculo', (select (count(*))::text || '/' || count(cenario_id)::text from public.rede_expansao_unidades where tenant_id = ta and nome = 'Usa Zeta'), '1/0');

  -- ---------------------------------------------------------------- resultado
  select count(*), count(*) filter (where not ok) into total, ruins from res;
  select string_agg(nome || ' → ' || detalhe, E'\n' order by nome) into falhas from res where not ok;
  -- Desfaz tudo de propósito: o resultado vai na mensagem do erro.
  if ruins = 0 then
    raise exception 'RLS_FINANCEIRO_OK % verificações, 0 falhas (nada foi gravado: o teste desfaz tudo)', total;
  else
    raise exception E'RLS_FINANCEIRO_FALHAS % de % verificações falharam:\n%', ruins, total, falhas;
  end if;
end
$test$;
