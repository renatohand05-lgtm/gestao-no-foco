-- Rede de lojas, rodada 17 — teste das regras do banco (RLS, restrições, planos de ação) por perfil.
--
-- COMO USAR: cole no SQL Editor do Supabase (ou rode por psql) e execute. O teste NÃO deixa nada para trás:
-- cria dados de teste, simula cada perfil (consultor, diretoria, gerente regional, gerente de loja, sem acesso, dono)
-- e termina de propósito com um erro (RAISE EXCEPTION), o que desfaz tudo.
-- O resultado aparece na mensagem desse erro: "RLS_QUALIDADE_OK ..." = tudo certo; "RLS_QUALIDADE_FALHAS ..." = lista o que falhou.
--
-- Pré-requisito: as empresas 'fat-buddha-demo' e 'fat-buddha' existem (com as 5 lojas) e a demonstração tem ao menos um membro.

create temp table if not exists res (nome text, ok boolean, detalhe text) on commit drop;
truncate res;

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
  dia date; dia2 date;
  v_bro uuid; v_per uuid; v_vil uuid; v_s uuid; v_del uuid;
  p_c uuid;
  c_vis_all bigint; c_vis_reg bigint; c_vis_bro bigint; c_pl_all bigint; c_pl_reg bigint; c_pl_bro bigint;
  falhas text; total int; ruins int;
  r text; s text; n bigint; d date;
  todas_sim jsonb;
  resp_nao text := '{"0-0":{"v":"nao","o":"sem etiqueta"},"0-1":{"v":"sim"}}';
  acao_nao text := '{"0-0":{"descricao":"Fichas técnicas disponíveis e seguidas","rotulo":"Visita de qualidade · Seção 1, item 1","acao":"","responsavel":"","prazo":"","prioridade":"media","status":"pendente"}}';
  e_ins_bro text[] := array['ok:1','erro:42501','ok:1','ok:1','erro:42501','ok:1'];
  e_ins_per text[] := array['ok:1','erro:42501','ok:1','erro:42501','erro:42501','ok:1'];
  e_ins_vil text[] := array['ok:1','erro:42501','erro:42501','erro:42501','erro:42501','ok:1'];
  e_upd_bro text[] := array['ok:1','ok:0','ok:1','ok:1','ok:0','ok:1'];
  e_upd_vil text[] := array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1'];
  e_negado  text[] := array['erro:42501','erro:42501','erro:42501','erro:42501','erro:42501','erro:42501'];
  e_zero    text[] := array['ok:0','ok:0','ok:0','ok:0','ok:0','ok:0'];
  e_mover   text[] := array['erro:23514','ok:0','erro:23514','erro:23514','ok:0','erro:23514'];
  e_del_per text[] := array['ok:1','ok:0','ok:1','ok:0','ok:0','ok:1'];
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
  select jsonb_object_agg(sec::text || '-' || itm::text, jsonb_build_object('v', 'sim')) into todas_sim
    from unnest(array[0,1,2,3,4,5]) sec, lateral generate_series(0, case when sec <= 3 then 5 else 4 end) itm;

  -- Dados da outra empresa: ninguém da demonstração pode enxergar.
  insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (tb, b_bro, date '2027-01-05', 'Alheio', '{"0-0":{"v":"sim"}}');
  insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao) values (tb, b_bro, 'manual', 'Manual', 'Alheio');

  for i in 0..5 loop
    dia := date '2027-03-01' + i;
    dia2 := date '2027-04-01' + i;

    delete from public.rede_acessos where tenant_id in (ta, tb) and user_id = u;
    update public.tenant_members set role = 'member' where user_id = u and tenant_id in (ta, tb);
    if i = 0 then insert into public.rede_acessos (tenant_id, user_id, papel, todas_lojas) values (ta, u, 'consultor', true);
    elsif i = 1 then insert into public.rede_acessos (tenant_id, user_id, papel, todas_lojas) values (ta, u, 'diretoria', true);
    elsif i = 2 then insert into public.rede_acessos (tenant_id, user_id, papel, todas_lojas, loja_ids) values (ta, u, 'gerente_regional', false, array[a_bro, a_per]);
    elsif i = 3 then insert into public.rede_acessos (tenant_id, user_id, papel, todas_lojas, loja_ids) values (ta, u, 'gerente_loja', false, array[a_bro]);
    elsif i = 5 then update public.tenant_members set role = 'owner' where user_id = u and tenant_id = ta;
    end if;

    -- Preparo (como dono do banco): uma visita e um plano "Alvo" em três lojas.
    insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas)
      select ta, l, dia, 'Alvo', '{"0-0":{"v":"nao"},"0-1":{"v":"sim"}}'::jsonb from unnest(array[a_bro, a_per, a_vil]) l;
    insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao)
      select ta, l, 'manual', 'Manual', 'Alvo' from unnest(array[a_bro, a_per, a_vil]) l;
    insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao, acao, status)
      values (ta, a_bro, 'manual', 'Manual', 'Concluido', 'feito', 'concluido');
    select id into v_bro from public.rede_qualidade_visitas where loja_id = a_bro and data = dia and avaliador = 'Alvo';
    select id into v_vil from public.rede_qualidade_visitas where loja_id = a_vil and data = dia and avaliador = 'Alvo';

    select count(*) into c_vis_all from public.rede_qualidade_visitas where tenant_id = ta;
    select count(*) into c_vis_reg from public.rede_qualidade_visitas where loja_id in (a_bro, a_per);
    select count(*) into c_vis_bro from public.rede_qualidade_visitas where loja_id = a_bro;
    select count(*) into c_pl_all from public.rede_planos_acao where tenant_id = ta;
    select count(*) into c_pl_reg from public.rede_planos_acao where loja_id in (a_bro, a_per);
    select count(*) into c_pl_bro from public.rede_planos_acao where loja_id = a_bro;

    -- ---------------------------------------------------------------- leitura
    perform pg_temp.t('lê visitas de qualidade', i, 'select 1 from public.rede_qualidade_visitas', array['ok:' || c_vis_all, 'ok:' || c_vis_all, 'ok:' || c_vis_reg, 'ok:' || c_vis_bro, 'ok:0', 'ok:' || c_vis_all]);
    perform pg_temp.t('lê planos de ação', i, 'select 1 from public.rede_planos_acao', array['ok:' || c_pl_all, 'ok:' || c_pl_all, 'ok:' || c_pl_reg, 'ok:' || c_pl_bro, 'ok:0', 'ok:' || c_pl_all]);
    for r in select unnest(array['rede_qualidade_visitas', 'rede_planos_acao']) loop
      perform pg_temp.t('não vê a outra empresa em ' || r, i, format('select 1 from public.%I where tenant_id = %L', r, tb), e_zero);
    end loop;

    -- ---------------------------------------------------------------- salvar visita (RPC)
    perform pg_temp.t('salva visita nova no Brooklyn (RPC)', i, format($q$select public.rede_qualidade_salvar(null, %L, %L, 'Teste', 'Gerente X', %L::jsonb, %L::jsonb)$q$, a_bro, dia2, resp_nao, acao_nao), e_ins_bro);
    perform pg_temp.t('salva visita nova na Perdizes (RPC)', i, format($q$select public.rede_qualidade_salvar(null, %L, %L, 'Teste', 'Gerente X', %L::jsonb, %L::jsonb)$q$, a_per, dia2, resp_nao, acao_nao), e_ins_per);
    perform pg_temp.t('salva visita nova na Vila Mariana (RPC)', i, format($q$select public.rede_qualidade_salvar(null, %L, %L, 'Teste', 'Gerente X', %L::jsonb, %L::jsonb)$q$, a_vil, dia2, resp_nao, acao_nao), e_ins_vil);
    perform pg_temp.t('salva visita em loja de outra empresa (RPC)', i, format($q$select public.rede_qualidade_salvar(null, %L, %L, 'Teste', 'Gerente X', %L::jsonb, %L::jsonb)$q$, b_bro, dia2, resp_nao, acao_nao), e_negado);
    perform pg_temp.t('corrige visita do Brooklyn (RPC)', i, format($q$select public.rede_qualidade_salvar(%L, %L, %L, 'Alvo', 'Gerente Y', %L::jsonb, %L::jsonb)$q$, v_bro, a_bro, dia, resp_nao, acao_nao), e_ins_bro);
    perform pg_temp.t('corrige visita da Vila Mariana (RPC)', i, format($q$select public.rede_qualidade_salvar(%L, %L, %L, 'Alvo', 'Gerente Y', %L::jsonb, %L::jsonb)$q$, v_vil, a_vil, dia, resp_nao, acao_nao), e_ins_vil);
    perform pg_temp.t('corrige visita apontando para loja errada (RPC)', i, format($q$select public.rede_qualidade_salvar(%L, %L, %L, 'Alvo', 'Gerente Y', %L::jsonb, %L::jsonb)$q$, v_bro, a_per, dia, resp_nao, acao_nao), array['erro:42501','erro:42501','erro:42501','erro:42501','erro:42501','erro:42501']);

    -- ---------------------------------------------------------------- visitas direto na tabela
    perform pg_temp.t('registra visita direto no Brooklyn', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, 'Direto', '{"0-0":{"v":"sim"}}')$q$, ta, a_bro, dia2), e_ins_bro);
    perform pg_temp.t('registra visita direto na Vila Mariana', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, 'Direto', '{"0-0":{"v":"sim"}}')$q$, ta, a_vil, dia2), e_ins_vil);
    perform pg_temp.t('registra visita em loja de outra empresa', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, 'Direto', '{"0-0":{"v":"sim"}}')$q$, tb, b_bro, dia2), e_negado);
    perform pg_temp.t('registra visita misturando empresa e loja', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, 'Direto', '{"0-0":{"v":"sim"}}')$q$, ta, b_bro, dia2), e_negado);
    perform pg_temp.t('move visita para outra loja', i, format($q$update public.rede_qualidade_visitas set loja_id = %L where loja_id = %L and avaliador = 'Alvo' and data = %L$q$, a_per, a_bro, dia), e_mover);

    -- ---------------------------------------------------------------- planos direto na tabela
    perform pg_temp.t('cria plano no Brooklyn', i, format($q$insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao) values (%L, %L, 'manual', 'Manual', 'Novo')$q$, ta, a_bro), e_ins_bro);
    perform pg_temp.t('cria plano na Perdizes', i, format($q$insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao) values (%L, %L, 'manual', 'Manual', 'Novo')$q$, ta, a_per), e_ins_per);
    perform pg_temp.t('cria plano na Vila Mariana', i, format($q$insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao) values (%L, %L, 'manual', 'Manual', 'Novo')$q$, ta, a_vil), e_ins_vil);
    perform pg_temp.t('cria plano em loja de outra empresa', i, format($q$insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao) values (%L, %L, 'manual', 'Manual', 'Novo')$q$, tb, b_bro), e_negado);
    perform pg_temp.t('cria plano misturando empresa e loja', i, format($q$insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao) values (%L, %L, 'manual', 'Manual', 'Novo')$q$, ta, b_bro), e_negado);
    perform pg_temp.t('corrige plano do Brooklyn', i, format($q$update public.rede_planos_acao set responsavel = 'Ana' where loja_id = %L and descricao = 'Alvo'$q$, a_bro), e_upd_bro);
    perform pg_temp.t('corrige plano da Vila Mariana', i, format($q$update public.rede_planos_acao set responsavel = 'Ana' where loja_id = %L and descricao = 'Alvo'$q$, a_vil), e_upd_vil);
    perform pg_temp.t('move plano para outra loja', i, format($q$update public.rede_planos_acao set loja_id = %L where loja_id = %L and descricao = 'Alvo'$q$, a_per, a_bro), e_mover);
    perform pg_temp.t('move plano para loja de outra empresa', i, format($q$update public.rede_planos_acao set loja_id = %L where loja_id = %L and descricao = 'Alvo'$q$, b_bro, a_bro), e_mover);

    -- Verificação de conclusão: só administrador, consultor e gerente regional; gerente de loja e diretoria não.
    perform pg_temp.t('verifica a conclusão do plano do Brooklyn', i, format($q$update public.rede_planos_acao set verificado_em = now() where loja_id = %L and descricao = 'Concluido'$q$, a_bro), array['ok:1','ok:0','ok:1','erro:42501','ok:0','ok:1']);
    select verificado_em is not null into s from public.rede_planos_acao where loja_id = a_bro and descricao = 'Concluido';
    perform pg_temp.chk('[' || (array['consultor','diretoria','gerente regional','gerente de loja','sem acesso','dono'])[i + 1] || '] a verificação ficou gravada só para quem pode', s, (array['true','false','true','false','false','true'])[i + 1]);
    select (verificado_por = u) into s from public.rede_planos_acao where loja_id = a_bro and descricao = 'Concluido' and verificado_em is not null;
    perform pg_temp.chk('[' || (array['consultor','diretoria','gerente regional','gerente de loja','sem acesso','dono'])[i + 1] || '] a verificação registra quem verificou', coalesce(s, 'sem'), (array['true','sem','true','sem','sem','true'])[i + 1]);

    -- ---------------------------------------------------------------- exclusões
    perform pg_temp.t('exclui plano da Perdizes', i, format($q$delete from public.rede_planos_acao where loja_id = %L and descricao = 'Alvo'$q$, a_per), e_del_per);
    perform pg_temp.t('exclui plano do Brooklyn', i, format($q$delete from public.rede_planos_acao where loja_id = %L and descricao = 'Alvo'$q$, a_bro), e_upd_bro);
    perform pg_temp.t('exclui visita da Perdizes', i, format($q$delete from public.rede_qualidade_visitas where loja_id = %L and avaliador = 'Alvo' and data = %L$q$, a_per, dia), e_del_per);
    perform pg_temp.t('exclui visita do Brooklyn', i, format($q$delete from public.rede_qualidade_visitas where loja_id = %L and avaliador = 'Alvo' and data = %L$q$, a_bro, dia), e_upd_bro);
    perform pg_temp.t('não executa a função interna de desvincular direto', i, 'select public.rede_planos_desvincular()', e_negado);

    -- ---------------------------------------------------------------- restrições do banco (uma vez)
    if i = 0 then
      -- Visitas
      perform pg_temp.t('visita: mesma loja, dia e avaliador (caixa/espaços) duas vezes é recusada', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, '  ALVO ', '{"0-0":{"v":"sim"}}')$q$, ta, a_vil, dia), array['erro:23505','','','','','']);
      perform pg_temp.t('visita: avaliador diferente no mesmo dia é permitido', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, 'Outro avaliador', '{"0-0":{"v":"sim"}}')$q$, ta, a_vil, dia), array['ok:1','','','','','']);
      perform pg_temp.t('visita: sem nenhum item avaliado é recusada', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, 'V1', '{}')$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('visita: só "não se aplica" não conta como avaliada', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, 'V2', '{"0-0":{"v":"na"}}')$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('visita: item fora da lista (seção 6)', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, 'V3', '{"6-0":{"v":"sim"}}')$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('visita: item fora da lista (7º item da seção 1)', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, 'V4', '{"0-6":{"v":"sim"}}')$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('visita: item fora da lista (6º item da seção 5, que tem 5)', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, 'V5', '{"4-5":{"v":"sim"}}')$q$, ta, a_tat, dia), array['erro:23514','','','','','']);
      perform pg_temp.t('visita: último item válido (seção 6, item 5) é aceito', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, 'V6', '{"5-4":{"v":"sim"}}')$q$, ta, a_tat, dia), array['ok:1','','','','','']);
      perform pg_temp.t('visita: resposta inválida é recusada', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, 'V7', '{"0-0":{"v":"talvez"}}')$q$, ta, a_tat, dia + 1), array['erro:23514','','','','','']);
      perform pg_temp.t('visita: observação acima de 300 caracteres é recusada', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, 'V8', jsonb_build_object('0-0', jsonb_build_object('v', 'sim', 'o', repeat('x', 301))))$q$, ta, a_tat, dia + 1), array['erro:23514','','','','','']);
      perform pg_temp.t('visita: campo estranho na resposta é recusado', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, 'V9', '{"0-0":{"v":"sim","x":1}}')$q$, ta, a_tat, dia + 1), array['erro:23514','','','','','']);
      perform pg_temp.t('visita: respostas que não são objeto são recusadas', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, 'V10', '["sim"]')$q$, ta, a_tat, dia + 1), array['erro:23514','','','','','']);
      perform pg_temp.t('visita: avaliador em branco é recusado', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, '   ', '{"0-0":{"v":"sim"}}')$q$, ta, a_tat, dia + 1), array['erro:23514','','','','','']);
      perform pg_temp.t('visita: gerente com mais de 120 caracteres é recusado', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, gerente, respostas) values (%L, %L, %L, 'V11', %L, '{"0-0":{"v":"sim"}}')$q$, ta, a_tat, dia + 1, repeat('x', 121)), array['erro:23514','','','','','']);
      perform pg_temp.t('visita: data anterior a 2020 é recusada', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, date '2019-12-31', 'V12', '{"0-0":{"v":"sim"}}')$q$, ta, a_tat), array['erro:23514','','','','','']);
      perform pg_temp.t('visita: os 34 itens respondidos são aceitos', i, format($q$insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (%L, %L, %L, 'V13', %L::jsonb)$q$, ta, a_tat, dia + 2, todas_sim::text), array['ok:1','','','','','']);
      perform pg_temp.chk('visita: os 34 itens têm 34 chaves', (select count(*)::text from jsonb_object_keys(todas_sim)), '34');

      -- Planos
      perform pg_temp.t('plano: "em andamento" sem ação é recusado', i, format($q$insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao, status) values (%L, %L, 'manual', 'M', 'P1', 'em_andamento')$q$, ta, a_tat), array['erro:23514','','','','','']);
      perform pg_temp.t('plano: "concluído" sem ação é recusado', i, format($q$insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao, status) values (%L, %L, 'manual', 'M', 'P2', 'concluido')$q$, ta, a_tat), array['erro:23514','','','','','']);
      perform pg_temp.t('plano: prioridade inválida é recusada', i, format($q$insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao, prioridade) values (%L, %L, 'manual', 'M', 'P3', 'urgente')$q$, ta, a_tat), array['erro:23514','','','','','']);
      perform pg_temp.t('plano: situação inválida é recusada', i, format($q$insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao, status) values (%L, %L, 'manual', 'M', 'P4', 'atrasado')$q$, ta, a_tat), array['erro:23514','','','','','']);
      perform pg_temp.t('plano: origem inválida é recusada', i, format($q$insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao) values (%L, %L, 'outra', 'M', 'P5')$q$, ta, a_tat), array['erro:23514','','','','','']);
      perform pg_temp.t('plano: descrição em branco é recusada', i, format($q$insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao) values (%L, %L, 'manual', 'M', '  ')$q$, ta, a_tat), array['erro:23514','','','','','']);
      perform pg_temp.t('plano: descrição acima de 500 caracteres é recusada', i, format($q$insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao) values (%L, %L, 'manual', 'M', %L)$q$, ta, a_tat, repeat('x', 501)), array['erro:23514','','','','','']);
      perform pg_temp.t('plano: ação acima de 600 caracteres é recusada', i, format($q$insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao, acao) values (%L, %L, 'manual', 'M', 'P6', %L)$q$, ta, a_tat, repeat('x', 601)), array['erro:23514','','','','','']);
      perform pg_temp.t('plano: prazo anterior a 2020 é recusado', i, format($q$insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao, prazo) values (%L, %L, 'manual', 'M', 'P7', date '2019-01-01')$q$, ta, a_tat), array['erro:23514','','','','','']);
      perform pg_temp.t('plano: ligado a um registro sem indicar o item é recusado', i, format($q$insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_id, origem_rotulo, descricao) values (%L, %L, 'qualidade', gen_random_uuid(), 'M', 'P8')$q$, ta, a_tat), array['erro:23514','','','','','']);
      perform pg_temp.t('plano: nascer verificado é recusado', i, format($q$insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao, acao, status, verificado_em) values (%L, %L, 'manual', 'M', 'P9', 'ok', 'concluido', now())$q$, ta, a_tat), array['erro:23514','','','','','']);
      perform pg_temp.t('plano: verificar plano que não está concluído é recusado', i, format($q$update public.rede_planos_acao set verificado_em = now() where loja_id = %L and descricao = 'Alvo'$q$, a_vil), array['erro:23514','','','','','']);
      perform pg_temp.t('plano: trocar a origem é recusado', i, format($q$update public.rede_planos_acao set origem_tipo = 'delivery' where loja_id = %L and descricao = 'Alvo'$q$, a_vil), array['erro:23514','','','','','']);

      -- Plano concluído: data de conclusão automática; reabrir limpa; verificação cai se o conteúdo muda.
      perform pg_temp.t('plano: concluir preenche a data de conclusão', i, format($q$update public.rede_planos_acao set status = 'concluido', acao = 'Corrigido' where loja_id = %L and descricao = 'Alvo'$q$, a_vil), array['ok:1','','','','','']);
      select (data_conclusao = (now() at time zone 'America/Sao_Paulo')::date)::text into s from public.rede_planos_acao where loja_id = a_vil and descricao = 'Alvo';
      perform pg_temp.chk('plano: a data de conclusão é a de hoje (Brasília)', s, 'true');
      perform pg_temp.t('plano: verificar a conclusão', i, format($q$update public.rede_planos_acao set verificado_em = now() where loja_id = %L and descricao = 'Alvo'$q$, a_vil), array['ok:1','','','','','']);
      perform pg_temp.t('plano: editar só o responsável mantém a verificação', i, format($q$update public.rede_planos_acao set responsavel = 'Beto' where loja_id = %L and descricao = 'Alvo'$q$, a_vil), array['ok:1','','','','','']);
      select (verificado_em is not null)::text into s from public.rede_planos_acao where loja_id = a_vil and descricao = 'Alvo';
      perform pg_temp.chk('plano: a verificação continua depois de editar o responsável', s, 'true');
      perform pg_temp.t('plano: editar a ação de um plano verificado', i, format($q$update public.rede_planos_acao set acao = 'Corrigido de outro jeito' where loja_id = %L and descricao = 'Alvo'$q$, a_vil), array['ok:1','','','','','']);
      select (verificado_em is null and verificado_por is null)::text into s from public.rede_planos_acao where loja_id = a_vil and descricao = 'Alvo';
      perform pg_temp.chk('plano: mudar a ação derruba a verificação', s, 'true');
      perform pg_temp.t('plano: reabrir o plano', i, format($q$update public.rede_planos_acao set status = 'em_andamento' where loja_id = %L and descricao = 'Alvo'$q$, a_vil), array['ok:1','','','','','']);
      select (data_conclusao is null and verificado_em is null)::text into s from public.rede_planos_acao where loja_id = a_vil and descricao = 'Alvo';
      perform pg_temp.chk('plano: reabrir limpa a data de conclusão', s, 'true');
      perform pg_temp.t('plano: cancelar', i, format($q$update public.rede_planos_acao set status = 'cancelado' where loja_id = %L and descricao = 'Alvo'$q$, a_vil), array['ok:1','','','','','']);

      -- Planos ligados a visitas (salvar pelo RPC como consultor): um por item "Não", sem duplicar ao salvar de novo.
      s := pg_temp.como(u, format($q$select public.rede_qualidade_salvar(null, %L, date '2027-06-01', 'Sync', 'G', %L::jsonb, %L::jsonb)$q$, a_tat,
        '{"0-0":{"v":"nao"},"0-1":{"v":"nao"},"0-2":{"v":"sim"}}',
        '{"0-0":{"descricao":"A","rotulo":"R","acao":"","prazo":"","prioridade":"media","status":"pendente"},"0-1":{"descricao":"B","rotulo":"R","acao":"fazer","responsavel":"Ana","prazo":"2027-07-01","prioridade":"alta","status":"em_andamento"}}'));
      perform pg_temp.chk('sync: salvar visita com 2 itens "Não"', s, 'ok:1');
      select id into v_s from public.rede_qualidade_visitas where loja_id = a_tat and avaliador = 'Sync';
      perform pg_temp.chk('sync: um plano por item "Não"', (select count(*)::text from public.rede_planos_acao where origem_tipo = 'qualidade' and origem_id = v_s), '2');
      select prioridade || '/' || status || '/' || coalesce(responsavel, '') || '/' || coalesce(prazo::text, '') into s from public.rede_planos_acao where origem_id = v_s and origem_ref = '0-1';
      perform pg_temp.chk('sync: o plano leva ação, responsável, prazo, prioridade e situação do formulário', s, 'alta/em_andamento/Ana/2027-07-01');
      select descricao || '|' || origem_rotulo into s from public.rede_planos_acao where origem_id = v_s and origem_ref = '0-0';
      perform pg_temp.chk('sync: o plano guarda o texto do item e da origem', s, 'A|R');
      perform pg_temp.t('plano: segundo plano para o mesmo item da mesma visita é recusado', i, format($q$insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_id, origem_ref, origem_rotulo, descricao) values (%L, %L, 'qualidade', %L, '0-0', 'R', 'A de novo')$q$, ta, a_tat, v_s), array['erro:23505','','','','','']);
      perform pg_temp.t('plano: trocar o registro de origem é recusado', i, format($q$update public.rede_planos_acao set origem_id = gen_random_uuid() where origem_id = %L and origem_ref = '0-0'$q$, v_s), array['erro:23514','','','','','']);

      s := pg_temp.como(u, format($q$select public.rede_qualidade_salvar(%L, %L, date '2027-06-01', 'Sync', 'G', %L::jsonb, %L::jsonb)$q$, v_s, a_tat,
        '{"0-0":{"v":"nao"},"0-1":{"v":"nao"},"0-2":{"v":"sim"}}',
        '{"0-0":{"descricao":"A","rotulo":"R","acao":"","prazo":"","prioridade":"media","status":"pendente"},"0-1":{"descricao":"B","rotulo":"R","acao":"fazer","responsavel":"Ana","prazo":"2027-07-01","prioridade":"alta","status":"em_andamento"}}'));
      perform pg_temp.chk('sync: salvar a mesma visita de novo', s, 'ok:1');
      perform pg_temp.chk('sync: salvar de novo não duplica os planos', (select count(*)::text from public.rede_planos_acao where origem_tipo = 'qualidade' and origem_id = v_s), '2');
      perform pg_temp.chk('sync: salvar de novo não duplica a visita', (select count(*)::text from public.rede_qualidade_visitas where loja_id = a_tat and avaliador = 'Sync'), '1');

      s := pg_temp.como(u, format($q$select public.rede_qualidade_salvar(%L, %L, date '2027-06-01', 'Sync', 'G', %L::jsonb, %L::jsonb)$q$, v_s, a_tat,
        '{"0-0":{"v":"sim"},"0-1":{"v":"nao"},"0-2":{"v":"sim"}}',
        '{"0-1":{"descricao":"B","rotulo":"R","acao":"fazer","responsavel":"Ana","prazo":"2027-07-01","prioridade":"alta","status":"em_andamento"}}'));
      perform pg_temp.chk('sync: corrigir item 1 para "Sim"', s, 'ok:1');
      select string_agg(origem_ref || ':' || status, ',' order by origem_ref) into s from public.rede_planos_acao where origem_id = v_s;
      perform pg_temp.chk('sync: plano pendente e sem ação do item corrigido some', s, '0-1:em_andamento');

      s := pg_temp.como(u, format($q$select public.rede_qualidade_salvar(%L, %L, date '2027-06-01', 'Sync', 'G', %L::jsonb, '{}'::jsonb)$q$, v_s, a_tat,
        '{"0-0":{"v":"sim"},"0-1":{"v":"sim"},"0-2":{"v":"sim"}}'));
      perform pg_temp.chk('sync: corrigir item 2 para "Sim"', s, 'ok:1');
      select status || '|' || (observacoes like 'Desvio retirado ao corrigir a visita em %')::text into s from public.rede_planos_acao where origem_id = v_s;
      perform pg_temp.chk('sync: plano com ação em andamento é cancelado, com aviso', s, 'cancelado|true');

      update public.rede_planos_acao set status = 'concluido' where origem_id = v_s;
      s := pg_temp.como(u, format($q$select public.rede_qualidade_salvar(%L, %L, date '2027-06-01', 'Sync', 'G', %L::jsonb, '{}'::jsonb)$q$, v_s, a_tat,
        '{"0-0":{"v":"sim"},"0-1":{"v":"sim"},"0-2":{"v":"sim"},"0-3":{"v":"na"}}'));
      perform pg_temp.chk('sync: salvar com plano concluído', s, 'ok:1');
      perform pg_temp.chk('sync: plano concluído não é mexido', (select status from public.rede_planos_acao where origem_id = v_s), 'concluido');

      s := pg_temp.como(u, format($q$select public.rede_qualidade_salvar(null, %L, date '2027-06-02', 'Sync2', 'G', '{"0-0":{"v":"nao"},"0-1":{"v":"sim"}}'::jsonb, '{"0-0":{"descricao":"C","rotulo":"R"}}'::jsonb)$q$, a_tat));
      perform pg_temp.chk('sync: segunda visita com item "Não" sem ação', s, 'ok:1');
      select id into v_del from public.rede_qualidade_visitas where loja_id = a_tat and avaliador = 'Sync2';
      perform pg_temp.chk('sync: plano nasce pendente, médio e sem prazo', (select status || '/' || prioridade || '/' || coalesce(prazo::text, 'sem') from public.rede_planos_acao where origem_id = v_del), 'pendente/media/sem');

      -- Excluir a visita: plano que nunca saiu do papel some; plano com trabalho feito fica, sem vínculo.
      perform pg_temp.chk('excluir visita (como consultor)', pg_temp.como(u, format($q$delete from public.rede_qualidade_visitas where id in (%L, %L)$q$, v_s, v_del)), 'ok:2');
      perform pg_temp.chk('excluir visita: plano pendente e sem ação some junto', (select count(*)::text from public.rede_planos_acao where descricao = 'C'), '0');
      select count(*)::text into s from public.rede_planos_acao where descricao = 'B' and origem_id is null and origem_ref = '0-1' and status = 'concluido';
      perform pg_temp.chk('excluir visita: plano concluído fica, sem vínculo e com o texto da origem', s, '1');

      -- Checklist de delivery: mesma regra ao excluir o registro.
      insert into public.rede_delivery_registros (tenant_id, loja_id, data, periodo, preparo) values (ta, a_tat, date '2027-06-03', 'diario', 30) returning id into v_del;
      insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_id, origem_ref, origem_rotulo, descricao) values (ta, a_tat, 'delivery', v_del, 'preparo', 'Delivery', 'Preparo fora da meta');
      insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_id, origem_ref, origem_rotulo, descricao, acao, status) values (ta, a_tat, 'delivery', v_del, 'rotina-1', 'Delivery', 'Item da rotina', 'Pausar itens', 'em_andamento');
      perform pg_temp.chk('excluir checklist de delivery (como consultor)', pg_temp.como(u, format($q$delete from public.rede_delivery_registros where id = %L$q$, v_del)), 'ok:1');
      select string_agg(descricao || ':' || coalesce(origem_id::text, 'sem'), ',' order by descricao) into s from public.rede_planos_acao where origem_tipo = 'delivery' and loja_id = a_tat;
      perform pg_temp.chk('excluir checklist: plano pendente some, plano em andamento fica sem vínculo', s, 'Item da rotina:sem');
    end if;

    -- ---------------------------------------------------------------- limpeza do cenário (tudo o que o teste criou nasceu no instante desta transação)
    delete from public.rede_planos_acao where created_at = now() and tenant_id = ta;
    delete from public.rede_qualidade_visitas where created_at = now() and tenant_id = ta;
    delete from public.rede_delivery_registros where created_at = now() and tenant_id = ta;
  end loop;

  -- ---------------------------------------------------------------- visitante sem login
  for r in select unnest(array['rede_qualidade_visitas', 'rede_planos_acao']) loop
    perform pg_temp.chk('visitante sem login não lê ' || r, case when pg_temp.como_anon(format('select 1 from public.%I', r)) in ('ok:0', 'erro:42501') then 'barrado' else 'VAZOU' end, 'barrado');
    perform pg_temp.chk('visitante sem login não grava em ' || r, case when pg_temp.como_anon(format('delete from public.%I', r)) in ('ok:0', 'erro:42501') then 'barrado' else 'VAZOU' end, 'barrado');
  end loop;
  perform pg_temp.chk('visitante sem login não executa o salvar da visita', pg_temp.como_anon(format($q$select public.rede_qualidade_salvar(null, %L, date '2027-06-01', 'Anon', 'G', '{"0-0":{"v":"sim"}}'::jsonb, '{}'::jsonb)$q$, a_bro)), 'erro:42501');

  -- ---------------------------------------------------------------- integridade (como dono do banco)
  update public.tenant_members set role = 'owner' where user_id = u and tenant_id = ta;
  begin
    insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (ta, b_bro, date '2027-07-05', 'X', '{"0-0":{"v":"sim"}}');
    perform pg_temp.chk('integridade: visita de loja de outra empresa', 'aceitou', 'recusou');
  exception when foreign_key_violation then perform pg_temp.chk('integridade: visita de loja de outra empresa', 'recusou', 'recusou'); end;
  begin
    insert into public.rede_planos_acao (tenant_id, loja_id, origem_tipo, origem_rotulo, descricao) values (ta, b_bro, 'manual', 'M', 'X');
    perform pg_temp.chk('integridade: plano de loja de outra empresa', 'aceitou', 'recusou');
  exception when foreign_key_violation then perform pg_temp.chk('integridade: plano de loja de outra empresa', 'recusou', 'recusou'); end;
  insert into public.rede_qualidade_visitas (tenant_id, loja_id, data, avaliador, respostas) values (ta, a_vil, date '2027-07-06', 'X', '{"0-0":{"v":"sim"}}');
  begin
    delete from public.rede_lojas where id = a_vil;
    perform pg_temp.chk('integridade: loja com visitas e planos não pode ser excluída', 'excluiu', 'recusou');
  exception when foreign_key_violation then perform pg_temp.chk('integridade: loja com visitas e planos não pode ser excluída', 'recusou', 'recusou'); end;
  perform pg_temp.chk('integridade: as 2 tabelas têm RLS ligado', (select count(*)::text from pg_class where relnamespace = 'public'::regnamespace and relname in ('rede_qualidade_visitas', 'rede_planos_acao') and relrowsecurity), '2');
  perform pg_temp.chk('histórico: visitas e planos gravados pela pessoa ficaram registrados', case when (select count(*) from public.rede_historico where entidade in ('rede_qualidade_visitas', 'rede_planos_acao') and user_id = u) > 0 then 'sim' else 'não' end, 'sim');
  perform pg_temp.chk('histórico: as duas tabelas têm gatilho de histórico', (select count(distinct tgrelid::regclass::text)::text from pg_trigger where tgname in ('rede_qualidade_visitas_historico_trg', 'rede_planos_acao_historico_trg')), '2');

  -- ---------------------------------------------------------------- resultado
  select count(*), count(*) filter (where not ok) into total, ruins from res;
  select string_agg(nome || ' → ' || detalhe, E'\n' order by nome) into falhas from res where not ok;
  if ruins = 0 then
    raise exception 'RLS_QUALIDADE_OK % verificações, 0 falhas (nada foi gravado: o teste desfaz tudo)', total;
  else
    raise exception E'RLS_QUALIDADE_FALHAS % de % verificações falharam:\n%', ruins, total, falhas;
  end if;
end
$test$;
