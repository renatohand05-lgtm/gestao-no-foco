-- Rede de lojas, rodada 16 — teste das regras do banco (RLS, restrições) da cozinha central e do delivery, por perfil.
--
-- COMO USAR: cole no SQL Editor do Supabase (ou rode por psql) e execute. O teste NÃO deixa nada para trás:
-- ele cria dados de teste, simula cada perfil (consultor, diretoria, gerente regional, gerente de loja,
-- sem acesso, dono) e termina de propósito com um erro (RAISE EXCEPTION), o que desfaz tudo.
-- O resultado aparece na mensagem desse erro: "RLS_COZINHA_OK ..." = tudo certo;
-- "RLS_COZINHA_FALHAS ..." = lista o que falhou.
--
-- Pré-requisito: as empresas 'fat-buddha-demo' (com os dados de exemplo da rodada 16) e 'fat-buddha'
-- existem, e a empresa de demonstração tem ao menos um membro. Usa esse membro como "a pessoa" de cada perfil.
--
-- Regra que o teste confirma: rupturas e delivery são por loja (cada perfil só mexe nas lojas dele);
-- o estoque da cozinha central é da empresa toda, e só quem tem acesso a todas as lojas (ou é dono/admin) altera.

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
  insert into res values (p_nome, p_obtido is not distinct from p_esperado, case when p_obtido is not distinct from p_esperado then null else 'obtido ' || coalesce(p_obtido, 'null') || ', esperado ' || coalesce(p_esperado, 'null') end);
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
  dia date; sem date;
  n_rup bigint; n_rup_reg bigint; n_rup_bro bigint; n_est bigint; n_del bigint; n_del_reg bigint; n_del_bro bigint;
  falhas text; total int; ruins int;
  r text;
  h0 bigint;
  -- esperado por cenário [consultor, diretoria, gerente regional, gerente de loja, sem acesso, dono]
  e_ins_bro text[] := array['ok:1','erro:42501','ok:1','ok:1','erro:42501','ok:1'];
  e_ins_per text[] := array['ok:1','erro:42501','ok:1','erro:42501','erro:42501','ok:1'];
  e_ins_vil text[] := array['ok:1','erro:42501','erro:42501','erro:42501','erro:42501','ok:1'];
  e_upd_bro text[] := array['ok:1','ok:0','ok:1','ok:1','ok:0','ok:1'];
  e_upd_vil text[] := array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1'];
  e_negado  text[] := array['erro:42501','erro:42501','erro:42501','erro:42501','erro:42501','erro:42501'];
  e_zero    text[] := array['ok:0','ok:0','ok:0','ok:0','ok:0','ok:0'];
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

  -- Dados da outra empresa (a real): ninguém da demonstração pode enxergar.
  insert into public.rede_rupturas (tenant_id, loja_id, data, item, motivo, horas) values (tb, b_bro, date '2027-01-05', 'Alheio', 'Atraso na entrega', 1);
  insert into public.rede_cc_estoque (tenant_id, item, unidade, atual, minimo, consumo_dia, custo_unitario) values (tb, 'Alheio', 'kg', 1, 1, 1, 1);
  insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo) values (tb, b_bro, date '2027-01-05', 'diario', 10);

  -- Contagens esperadas (empresa de demonstração), calculadas como dono do banco.
  select count(*) into n_rup from public.rede_rupturas where tenant_id = ta;
  select count(*) into n_rup_reg from public.rede_rupturas where loja_id in (a_bro, a_per);
  select count(*) into n_rup_bro from public.rede_rupturas where loja_id = a_bro;
  select count(*) into n_est from public.rede_cc_estoque where tenant_id = ta;
  select count(*) into n_del from public.rede_delivery_registros where tenant_id = ta;
  select count(*) into n_del_reg from public.rede_delivery_registros where loja_id in (a_bro, a_per);
  select count(*) into n_del_bro from public.rede_delivery_registros where loja_id = a_bro;
  perform pg_temp.chk('preparo: há dados de exemplo da cozinha e do delivery na demonstração', case when n_rup > 0 and n_est > 0 and n_del > 0 and n_rup_reg < n_rup and n_rup_bro < n_rup_reg then 'sim' else 'não' end, 'sim');

  for i in 0..5 loop
    dia := date '2027-03-01' + i;          -- datas diferentes por cenário (nunca colidem)
    sem := date '2027-01-04' + 7 * i;      -- segundas-feiras diferentes por cenário

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
    perform pg_temp.t('lê rupturas', i, 'select 1 from public.rede_rupturas', array['ok:' || n_rup, 'ok:' || n_rup, 'ok:' || n_rup_reg, 'ok:' || n_rup_bro, 'ok:0', 'ok:' || n_rup]);
    perform pg_temp.t('lê estoque da cozinha central', i, 'select 1 from public.rede_cc_estoque', array['ok:' || n_est, 'ok:' || n_est, 'ok:' || n_est, 'ok:0', 'ok:0', 'ok:' || n_est]);
    perform pg_temp.t('lê checklists de delivery', i, 'select 1 from public.rede_delivery_registros', array['ok:' || n_del, 'ok:' || n_del, 'ok:' || n_del_reg, 'ok:' || n_del_bro, 'ok:0', 'ok:' || n_del]);
    for r in select unnest(array['rede_rupturas', 'rede_cc_estoque', 'rede_delivery_registros']) loop
      perform pg_temp.t('não vê a outra empresa em ' || r, i, format('select 1 from public.%I where tenant_id = %L', r, tb), e_zero);
    end loop;

    -- ---------------------------------------------------------------- preparo (como dono do banco)
    insert into public.rede_rupturas (tenant_id, loja_id, data, item, motivo, horas)
      select ta, l, dia, 'Alvo', 'Falta na cozinha central', 1 from unnest(array[a_bro, a_per, a_vil]) l;
    insert into public.rede_cc_estoque (tenant_id, item, unidade, atual, minimo, consumo_dia, custo_unitario) values (ta, 'Alvo ' || i, 'kg', 10, 5, 1, 2);
    insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo)
      select ta, l, dia, 'diario', 10 from unnest(array[a_bro, a_per, a_vil]) l;

    -- ---------------------------------------------------------------- rupturas
    perform pg_temp.t('registra ruptura no Brooklyn', i, format($q$insert into public.rede_rupturas (tenant_id, loja_id, data, item, motivo, horas) values (%L, %L, %L, 'Teste', 'Atraso na entrega', 2)$q$, ta, a_bro, dia), e_ins_bro);
    perform pg_temp.t('registra ruptura na Perdizes', i, format($q$insert into public.rede_rupturas (tenant_id, loja_id, data, item, motivo, horas) values (%L, %L, %L, 'Teste', 'Atraso na entrega', 2)$q$, ta, a_per, dia), e_ins_per);
    perform pg_temp.t('registra ruptura na Vila Mariana', i, format($q$insert into public.rede_rupturas (tenant_id, loja_id, data, item, motivo, horas) values (%L, %L, %L, 'Teste', 'Atraso na entrega', 2)$q$, ta, a_vil, dia), e_ins_vil);
    perform pg_temp.t('registra ruptura em loja de outra empresa', i, format($q$insert into public.rede_rupturas (tenant_id, loja_id, data, item, motivo, horas) values (%L, %L, %L, 'Teste', 'Atraso na entrega', 2)$q$, tb, b_bro, dia), e_negado);
    perform pg_temp.t('registra ruptura misturando empresa e loja', i, format($q$insert into public.rede_rupturas (tenant_id, loja_id, data, item, motivo, horas) values (%L, %L, %L, 'Teste', 'Atraso na entrega', 2)$q$, ta, b_bro, dia), e_negado);
    perform pg_temp.t('corrige ruptura do Brooklyn', i, format($q$update public.rede_rupturas set acao = 'x' where loja_id = %L and item = 'Alvo' and data = %L$q$, a_bro, dia), e_upd_bro);
    perform pg_temp.t('corrige ruptura da Vila Mariana', i, format($q$update public.rede_rupturas set acao = 'x' where loja_id = %L and item = 'Alvo' and data = %L$q$, a_vil, dia), e_upd_vil);
    perform pg_temp.t('move ruptura para loja de outra empresa', i, format($q$update public.rede_rupturas set loja_id = %L where loja_id = %L and item = 'Alvo' and data = %L$q$, b_bro, a_bro, dia), array['erro:42501','ok:0','erro:42501','erro:42501','ok:0','erro:42501']);
    perform pg_temp.t('exclui ruptura da Perdizes', i, format($q$delete from public.rede_rupturas where loja_id = %L and item = 'Alvo' and data = %L$q$, a_per, dia), array['ok:1','ok:0','ok:1','ok:0','ok:0','ok:1']);
    perform pg_temp.t('exclui ruptura do Brooklyn', i, format($q$delete from public.rede_rupturas where loja_id = %L and item = 'Alvo' and data = %L$q$, a_bro, dia), e_upd_bro);

    -- ---------------------------------------------------------------- estoque da cozinha central (da empresa toda)
    perform pg_temp.t('cria item no estoque', i, format($q$insert into public.rede_cc_estoque (tenant_id, item, unidade, atual, minimo, consumo_dia, custo_unitario) values (%L, 'Teste %s', 'kg', 1, 1, 1, 1)$q$, ta, i), array['ok:1','erro:42501','erro:42501','erro:42501','erro:42501','ok:1']);
    perform pg_temp.t('cria item em outra empresa', i, format($q$insert into public.rede_cc_estoque (tenant_id, item, unidade, atual, minimo, consumo_dia, custo_unitario) values (%L, 'Teste x %s', 'kg', 1, 1, 1, 1)$q$, tb, i), e_negado);
    perform pg_temp.t('ajusta estoque atual', i, format($q$update public.rede_cc_estoque set atual = 3 where tenant_id = %L and item = %L$q$, ta, 'Alvo ' || i), array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1']);
    perform pg_temp.t('ajusta item de outra empresa', i, format($q$update public.rede_cc_estoque set atual = 3 where tenant_id = %L$q$, tb), e_zero);
    perform pg_temp.t('move item para outra empresa', i, format($q$update public.rede_cc_estoque set tenant_id = %L where tenant_id = %L and item = %L$q$, tb, ta, 'Alvo ' || i), array['erro:42501','ok:0','ok:0','ok:0','ok:0','erro:42501']);
    perform pg_temp.t('exclui item do estoque', i, format($q$delete from public.rede_cc_estoque where tenant_id = %L and item = %L$q$, ta, 'Alvo ' || i), array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1']);

    -- ---------------------------------------------------------------- delivery
    perform pg_temp.t('salva checklist no Brooklyn', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo) values (%L, %L, %L, 'semanal', 12)$q$, ta, a_bro, sem), e_ins_bro);
    perform pg_temp.t('salva checklist na Perdizes', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo) values (%L, %L, %L, 'semanal', 12)$q$, ta, a_per, sem), e_ins_per);
    perform pg_temp.t('salva checklist na Vila Mariana', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo) values (%L, %L, %L, 'semanal', 12)$q$, ta, a_vil, sem), e_ins_vil);
    perform pg_temp.t('salva checklist em loja de outra empresa', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo) values (%L, %L, %L, 'semanal', 12)$q$, tb, b_bro, sem), e_negado);
    perform pg_temp.t('salva checklist misturando empresa e loja', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo) values (%L, %L, %L, 'semanal', 12)$q$, ta, b_bro, sem), e_negado);
    perform pg_temp.t('corrige checklist do Brooklyn', i, format($q$update public.rede_delivery_registros set observacoes = 'x' where loja_id = %L and data = %L and periodo = 'diario'$q$, a_bro, dia), e_upd_bro);
    perform pg_temp.t('corrige checklist da Vila Mariana', i, format($q$update public.rede_delivery_registros set observacoes = 'x' where loja_id = %L and data = %L and periodo = 'diario'$q$, a_vil, dia), e_upd_vil);
    perform pg_temp.t('move checklist para loja de outra empresa', i, format($q$update public.rede_delivery_registros set loja_id = %L where loja_id = %L and data = %L and periodo = 'diario'$q$, b_bro, a_bro, dia), array['erro:42501','ok:0','erro:42501','erro:42501','ok:0','erro:42501']);
    perform pg_temp.t('exclui checklist da Perdizes', i, format($q$delete from public.rede_delivery_registros where loja_id = %L and data = %L and periodo = 'diario'$q$, a_per, dia), array['ok:1','ok:0','ok:1','ok:0','ok:0','ok:1']);
    perform pg_temp.t('exclui checklist do Brooklyn', i, format($q$delete from public.rede_delivery_registros where loja_id = %L and data = %L and periodo = 'diario'$q$, a_bro, dia), e_upd_bro);
    perform pg_temp.t('não executa a função interna de histórico direto', i, 'select public.rede_historico_trg()', e_negado);

    -- ---------------------------------------------------------------- restrições do banco (uma vez: valem para qualquer perfil que grave)
    if i = 0 then
      -- rupturas
      perform pg_temp.t('ruptura: motivo fora da lista é recusado', i, format($q$insert into public.rede_rupturas (tenant_id, loja_id, data, item, motivo, horas) values (%L, %L, %L, 'R1', 'Outro', 1)$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('ruptura: horas negativas são recusadas', i, format($q$insert into public.rede_rupturas (tenant_id, loja_id, data, item, motivo, horas) values (%L, %L, %L, 'R2', 'Atraso na entrega', -1)$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('ruptura: mais de 720 horas é recusado', i, format($q$insert into public.rede_rupturas (tenant_id, loja_id, data, item, motivo, horas) values (%L, %L, %L, 'R3', 'Atraso na entrega', 721)$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('ruptura: item em branco é recusado', i, format($q$insert into public.rede_rupturas (tenant_id, loja_id, data, item, motivo, horas) values (%L, %L, %L, '   ', 'Atraso na entrega', 1)$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('ruptura: item com mais de 120 caracteres é recusado', i, format($q$insert into public.rede_rupturas (tenant_id, loja_id, data, item, motivo, horas) values (%L, %L, %L, %L, 'Atraso na entrega', 1)$q$, ta, a_tat, dia, repeat('x', 121)), array['erro:23514','','','','','']);
      perform pg_temp.t('ruptura: ação com mais de 300 caracteres é recusada', i, format($q$insert into public.rede_rupturas (tenant_id, loja_id, data, item, motivo, horas, acao) values (%L, %L, %L, 'R4', 'Atraso na entrega', 1, %L)$q$, ta, a_tat, dia, repeat('x', 301)), array['erro:23514','','','','','']);
      perform pg_temp.t('ruptura: sem data é recusada', i, format($q$insert into public.rede_rupturas (tenant_id, loja_id, item, motivo, horas) values (%L, %L, 'R5', 'Atraso na entrega', 1)$q$, ta, a_tat), array['erro:23502','','','','','']);
      -- estoque
      perform pg_temp.t('estoque: nome repetido (caixa e espaços) é recusado', i, format($q$insert into public.rede_cc_estoque (tenant_id, item, unidade, atual, minimo, consumo_dia, custo_unitario) values (%L, '  ARROZ japonês ', 'kg', 1, 1, 1, 1)$q$, ta), array['erro:23505','','','','','']);
      begin
        insert into public.rede_cc_estoque (tenant_id, item, unidade, atual, minimo, consumo_dia, custo_unitario) values (tb, 'Arroz japonês', 'kg', 1, 1, 1, 1);
        perform pg_temp.chk('estoque: o mesmo nome em outra empresa é permitido (a unicidade é por empresa)', 'permitido', 'permitido');
      exception when unique_violation then
        perform pg_temp.chk('estoque: o mesmo nome em outra empresa é permitido (a unicidade é por empresa)', 'recusado', 'permitido');
      end;
      perform pg_temp.t('estoque: quantidade negativa é recusada', i, format($q$insert into public.rede_cc_estoque (tenant_id, item, unidade, atual, minimo, consumo_dia, custo_unitario) values (%L, 'E1', 'kg', -1, 1, 1, 1)$q$, ta), array['erro:23514','','','','','']);
      perform pg_temp.t('estoque: consumo negativo é recusado', i, format($q$insert into public.rede_cc_estoque (tenant_id, item, unidade, atual, minimo, consumo_dia, custo_unitario) values (%L, 'E2', 'kg', 1, 1, -1, 1)$q$, ta), array['erro:23514','','','','','']);
      perform pg_temp.t('estoque: custo negativo é recusado', i, format($q$insert into public.rede_cc_estoque (tenant_id, item, unidade, atual, minimo, consumo_dia, custo_unitario) values (%L, 'E3', 'kg', 1, 1, 1, -0.01)$q$, ta), array['erro:23514','','','','','']);
      perform pg_temp.t('estoque: unidade em branco é recusada', i, format($q$insert into public.rede_cc_estoque (tenant_id, item, unidade, atual, minimo, consumo_dia, custo_unitario) values (%L, 'E4', ' ', 1, 1, 1, 1)$q$, ta), array['erro:23514','','','','','']);
      perform pg_temp.t('estoque: unidade com mais de 12 caracteres é recusada', i, format($q$insert into public.rede_cc_estoque (tenant_id, item, unidade, atual, minimo, consumo_dia, custo_unitario) values (%L, 'E5', 'caixa de 12 unid', 1, 1, 1, 1)$q$, ta), array['erro:23514','','','','','']);
      perform pg_temp.t('estoque: nome em branco é recusado', i, format($q$insert into public.rede_cc_estoque (tenant_id, item, unidade, atual, minimo, consumo_dia, custo_unitario) values (%L, '  ', 'kg', 1, 1, 1, 1)$q$, ta), array['erro:23514','','','','','']);
      -- delivery
      perform pg_temp.t('delivery: mesma loja, dia e período duas vezes é recusado', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo) values (%L, %L, %L, 'diario', 9)$q$, ta, a_vil, dia), array['erro:23505','','','','','']);
      perform pg_temp.t('delivery: diário e semanal no mesmo dia são registros diferentes', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo) values (%L, %L, %L, 'semanal', 9)$q$, ta, a_tat, date '2027-02-01'), array['ok:1','','','','','']);
      perform pg_temp.t('delivery: semanal fora da segunda-feira é recusado', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo) values (%L, %L, date '2027-02-03', 'semanal', 9)$q$, ta, a_tat), array['erro:23514','','','','','']);
      perform pg_temp.t('delivery: período inválido é recusado', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo) values (%L, %L, %L, 'mensal', 9)$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('delivery: sem nenhum indicador é recusado', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, pedidos) values (%L, %L, %L, 'diario', 10)$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('delivery: preparo acima de 600 min é recusado', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo) values (%L, %L, %L, 'diario', 601)$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('delivery: percentual acima de 100 é recusado', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, cancelamentos) values (%L, %L, %L, 'diario', 100.5)$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('delivery: nota iFood acima de 5 é recusada', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, nota_ifood) values (%L, %L, %L, 'diario', 5.1)$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('delivery: valor negativo é recusado', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo, ticket_medio) values (%L, %L, %L, 'diario', 9, -1)$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('delivery: rotina com item inexistente (7) é recusada', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo, rotina) values (%L, %L, %L, 'diario', 9, '{"7":"sim"}'::jsonb)$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('delivery: rotina com resposta inválida é recusada', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo, rotina) values (%L, %L, %L, 'diario', 9, '{"0":"talvez"}'::jsonb)$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('delivery: rotina que não é objeto é recusada', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo, rotina) values (%L, %L, %L, 'diario', 9, '["sim"]'::jsonb)$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('delivery: rotina válida é aceita', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo, rotina) values (%L, %L, %L, 'diario', 9, '{"0":"sim","3":"nao","6":"na"}'::jsonb)$q$, ta, a_tat, dia), array['ok:1','','','','','']);
      perform pg_temp.t('delivery: observações com mais de 1000 caracteres são recusadas', i, format($q$insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo, observacoes) values (%L, %L, %L, 'diario', 9, %L)$q$, ta, a_vil, dia + 100, repeat('x', 1001)), array['erro:23514','','','','','']);
      select count(*) into h0 from public.rede_historico where tenant_id = ta and user_id = u;
      perform pg_temp.chk('histórico: o que a pessoa gravou ficou registrado com o nome dela', case when h0 > 0 then 'sim' else 'não' end, 'sim');
    end if;

    -- ---------------------------------------------------------------- limpeza do cenário
    delete from public.rede_rupturas where data >= date '2027-01-01' and tenant_id = ta;
    delete from public.rede_cc_estoque where tenant_id = ta and (item like 'Alvo%' or item like 'Teste%');
    delete from public.rede_delivery_registros where data >= date '2027-01-01' and tenant_id = ta;
  end loop;

  -- ---------------------------------------------------------------- visitante sem login
  for r in select unnest(array['rede_rupturas', 'rede_cc_estoque', 'rede_delivery_registros']) loop
    perform pg_temp.chk('visitante sem login não lê ' || r, case when pg_temp.como_anon(format('select 1 from public.%I', r)) in ('ok:0', 'erro:42501') then 'barrado' else 'VAZOU' end, 'barrado');
    perform pg_temp.chk('visitante sem login não grava em ' || r, case when pg_temp.como_anon(format('delete from public.%I', r)) in ('ok:0', 'erro:42501') then 'barrado' else 'VAZOU' end, 'barrado');
  end loop;

  -- ---------------------------------------------------------------- integridade (como dono do banco)
  update public.tenant_members set role = 'owner' where user_id = u and tenant_id = ta;
  begin
    insert into public.rede_rupturas (tenant_id, loja_id, data, item, motivo, horas) values (ta, b_bro, date '2027-07-05', 'X', 'Atraso na entrega', 1);
    perform pg_temp.chk('integridade: ruptura de loja de outra empresa', 'aceitou', 'recusou');
  exception when foreign_key_violation then perform pg_temp.chk('integridade: ruptura de loja de outra empresa', 'recusou', 'recusou'); end;
  begin
    insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo) values (ta, b_bro, date '2027-07-05', 'diario', 1);
    perform pg_temp.chk('integridade: checklist de loja de outra empresa', 'aceitou', 'recusou');
  exception when foreign_key_violation then perform pg_temp.chk('integridade: checklist de loja de outra empresa', 'recusou', 'recusou'); end;
  begin
    delete from public.rede_lojas where id = a_vil;
    perform pg_temp.chk('integridade: loja com rupturas e checklists não pode ser excluída', 'excluiu', 'recusou');
  exception when foreign_key_violation then perform pg_temp.chk('integridade: loja com rupturas e checklists não pode ser excluída', 'recusou', 'recusou'); end;
  perform pg_temp.chk('integridade: as 3 tabelas têm RLS ligado', (select count(*)::text from pg_class where relnamespace = 'public'::regnamespace and relname in ('rede_rupturas', 'rede_cc_estoque', 'rede_delivery_registros') and relrowsecurity), '3');
  perform pg_temp.chk('integridade: o teste não alterou os dados de exemplo', (select count(*)::text from public.rede_rupturas where tenant_id = ta) || '/' || (select count(*)::text from public.rede_cc_estoque where tenant_id = ta) || '/' || (select count(*)::text from public.rede_delivery_registros where tenant_id = ta), n_rup || '/' || n_est || '/' || n_del);

  -- ---------------------------------------------------------------- resultado
  select count(*), count(*) filter (where not ok) into total, ruins from res;
  select string_agg(nome || ' → ' || detalhe, E'\n' order by nome) into falhas from res where not ok;
  -- Desfaz tudo de propósito: o resultado vai na mensagem do erro.
  if ruins = 0 then
    raise exception 'RLS_COZINHA_OK % verificações, 0 falhas (nada foi gravado: o teste desfaz tudo)', total;
  else
    raise exception E'RLS_COZINHA_FALHAS % de % verificações falharam:\n%', ruins, total, falhas;
  end if;
end
$test$;
