-- Rede de lojas, rodada 18 — teste das regras do banco do RH (RLS, restrições, ocorrências) por perfil.
--
-- COMO USAR: cole no SQL Editor do Supabase (ou rode por psql) e execute. O teste NÃO deixa nada para trás:
-- cria dados de teste, simula cada perfil (consultor, diretoria, gerente regional, gerente de loja, sem acesso, dono, colaborador autorizado)
-- e termina de propósito com um erro (RAISE EXCEPTION), o que desfaz tudo.
-- O resultado aparece na mensagem desse erro: "RLS_RH_OK ..." = tudo certo; "RLS_RH_FALHAS ..." = lista o que falhou.
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
  perform pg_temp.chk('[' || (array['consultor','diretoria','gerente regional','gerente de loja','sem acesso','dono','colaborador'])[p_i + 1] || '] ' || p_nome,
    pg_temp.como(current_setting('t.u')::uuid, p_sql), p_esp[p_i + 1]);
end $f$;


create or replace function pg_temp.tenta(p_sql text) returns text language plpgsql as $f$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return 'erro:' || sqlstate;
end $f$;

do $test$
declare
  u uuid;
  ta uuid; tb uuid;
  a_bro uuid; a_per uuid; a_vil uuid; a_tat uuid; b_bro uuid;
  i int;
  mes1 date; mes2 date;
  c_bro uuid; c_per uuid; c_vil uuid; c_x uuid; c_y uuid;
  o_bro uuid;
  n_col_all bigint; n_col_reg bigint; n_col_bro bigint;
  n_qp_all bigint; n_qp_reg bigint; n_qp_bro bigint;
  n_m_all bigint; n_m_reg bigint; n_m_bro bigint;
  n_o_all bigint; n_o_reg bigint; n_o_bro bigint;
  n_h bigint;
  falhas text; total int; ruins int;
  r text;
  -- ordem: consultor, diretoria, gerente regional (Brooklyn+Perdizes), gerente de loja (Brooklyn), sem acesso, dono, colaborador
  e_neg  text[] := array['erro:42501','erro:42501','erro:42501','erro:42501','erro:42501','erro:42501','erro:42501'];
  e_zero text[] := array['ok:0','ok:0','ok:0','ok:0','ok:0','ok:0','ok:0'];
  -- rh_quadro (cadastro e quadro previsto): só consultor e dono escrevem
  e_q_ins text[] := array['ok:1','erro:42501','erro:42501','erro:42501','erro:42501','ok:1','erro:42501'];
  e_q_upd text[] := array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1','ok:0'];
  -- rh_movimentos e rh_ocorrencias: consultor, dono e gerente regional (só as lojas dele)
  e_r_ins_reg text[] := array['ok:1','erro:42501','ok:1','erro:42501','erro:42501','ok:1','erro:42501'];
  e_r_ins_vil text[] := array['ok:1','erro:42501','erro:42501','erro:42501','erro:42501','ok:1','erro:42501'];
  e_r_upd_reg text[] := array['ok:1','ok:0','ok:1','ok:0','ok:0','ok:1','ok:0'];
  e_r_upd_vil text[] := array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1','ok:0'];
  -- o colaborador da Vila Mariana tem 2 ocorrências nesse ponto (a do preparo e a que o teste registrou)
  e_r_upd_vil2 text[] := array['ok:2','ok:0','ok:0','ok:0','ok:0','ok:2','ok:0'];
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

  -- Dados da outra empresa: ninguém da demonstração pode enxergar.
  insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (tb, b_bro, 'Alheio Silva', 'atendente', date '2026-01-05');
  insert into public.rede_rh_quadro_previsto (tenant_id, loja_id, cargo, previsto) values (tb, b_bro, 'atendente', 3);
  insert into public.rede_rh_mensal (tenant_id, loja_id, mes, headcount_medio, dias_previstos) values (tb, b_bro, date '2026-01-01', 10, 260);
  insert into public.rede_rh_ocorrencias (tenant_id, loja_id, colaborador_id, tipo, data, motivo)
    select tb, b_bro, id, 'feedback', date '2026-02-01', 'Alheio' from public.rede_rh_colaboradores where tenant_id = tb and nome = 'Alheio Silva';

  for i in 0..6 loop
    mes1 := (date '2027-01-01' + make_interval(months => i))::date;
    mes2 := (date '2028-01-01' + make_interval(months => i))::date;

    delete from public.rede_acessos where tenant_id in (ta, tb) and user_id = u;
    update public.tenant_members set role = 'member' where user_id = u and tenant_id in (ta, tb);
    if i = 0 then insert into public.rede_acessos (tenant_id, user_id, papel, todas_lojas) values (ta, u, 'consultor', true);
    elsif i = 1 then insert into public.rede_acessos (tenant_id, user_id, papel, todas_lojas) values (ta, u, 'diretoria', true);
    elsif i = 2 then insert into public.rede_acessos (tenant_id, user_id, papel, todas_lojas, loja_ids) values (ta, u, 'gerente_regional', false, array[a_bro, a_per]);
    elsif i = 3 then insert into public.rede_acessos (tenant_id, user_id, papel, todas_lojas, loja_ids) values (ta, u, 'gerente_loja', false, array[a_bro]);
    elsif i = 5 then update public.tenant_members set role = 'owner' where user_id = u and tenant_id = ta;
    elsif i = 6 then insert into public.rede_acessos (tenant_id, user_id, papel, todas_lojas, modulos) values (ta, u, 'colaborador', true, array['dashboard', 'vendas', 'planos_acao']);
    end if;

    -- Preparo (como dono do banco): um colaborador, uma ocorrência e um mês "Alvo" em três lojas; cargos de teste no quadro previsto.
    insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao)
      select ta, l, 'Alvo Teste ' || i, 'atendente', date '2026-01-10' from unnest(array[a_bro, a_per, a_vil]) l;
    select id into c_bro from public.rede_rh_colaboradores where loja_id = a_bro and nome = 'Alvo Teste ' || i;
    select id into c_per from public.rede_rh_colaboradores where loja_id = a_per and nome = 'Alvo Teste ' || i;
    select id into c_vil from public.rede_rh_colaboradores where loja_id = a_vil and nome = 'Alvo Teste ' || i;
    insert into public.rede_rh_ocorrencias (tenant_id, loja_id, colaborador_id, tipo, data, motivo)
      select ta, loja_id, id, 'feedback', date '2026-11-01', 'Alvo' from public.rede_rh_colaboradores where id in (c_bro, c_per, c_vil);
    select id into o_bro from public.rede_rh_ocorrencias where colaborador_id = c_bro;
    insert into public.rede_rh_mensal (tenant_id, loja_id, mes, headcount_medio, admissoes, desligamentos, dias_falta, dias_previstos)
      select ta, l, mes1, 10, 1, 1, 2, 260 from unnest(array[a_bro, a_per, a_vil]) l;
    delete from public.rede_rh_quadro_previsto where loja_id in (a_bro, a_per, a_vil) and cargo in ('gerente_loja', 'atendente');
    insert into public.rede_rh_quadro_previsto (tenant_id, loja_id, cargo, previsto)
      select ta, l, 'atendente', 3 from unnest(array[a_bro, a_per, a_vil]) l;

    select count(*) into n_col_all from public.rede_rh_colaboradores where tenant_id = ta;
    select count(*) into n_col_reg from public.rede_rh_colaboradores where loja_id in (a_bro, a_per);
    select count(*) into n_col_bro from public.rede_rh_colaboradores where loja_id = a_bro;
    select count(*) into n_qp_all from public.rede_rh_quadro_previsto where tenant_id = ta;
    select count(*) into n_qp_reg from public.rede_rh_quadro_previsto where loja_id in (a_bro, a_per);
    select count(*) into n_qp_bro from public.rede_rh_quadro_previsto where loja_id = a_bro;
    select count(*) into n_m_all from public.rede_rh_mensal where tenant_id = ta;
    select count(*) into n_m_reg from public.rede_rh_mensal where loja_id in (a_bro, a_per);
    select count(*) into n_m_bro from public.rede_rh_mensal where loja_id = a_bro;
    select count(*) into n_o_all from public.rede_rh_ocorrencias where tenant_id = ta;
    select count(*) into n_o_reg from public.rede_rh_ocorrencias where loja_id in (a_bro, a_per);
    select count(*) into n_o_bro from public.rede_rh_ocorrencias where loja_id = a_bro;
    select count(*) into n_h from public.rede_historico where tenant_id = ta and entidade like 'rede_rh_%';

    -- ---------------------------------------------------------------- leitura
    perform pg_temp.t('lê colaboradores', i, 'select 1 from public.rede_rh_colaboradores', array['ok:' || n_col_all, 'ok:' || n_col_all, 'ok:' || n_col_reg, 'ok:' || n_col_bro, 'ok:0', 'ok:' || n_col_all, 'ok:0']);
    perform pg_temp.t('lê quadro previsto', i, 'select 1 from public.rede_rh_quadro_previsto', array['ok:' || n_qp_all, 'ok:' || n_qp_all, 'ok:' || n_qp_reg, 'ok:' || n_qp_bro, 'ok:0', 'ok:' || n_qp_all, 'ok:0']);
    perform pg_temp.t('lê lançamentos mensais', i, 'select 1 from public.rede_rh_mensal', array['ok:' || n_m_all, 'ok:' || n_m_all, 'ok:' || n_m_reg, 'ok:0', 'ok:0', 'ok:' || n_m_all, 'ok:0']);
    perform pg_temp.t('lê ocorrências', i, 'select 1 from public.rede_rh_ocorrencias', array['ok:' || n_o_all, 'ok:0', 'ok:' || n_o_reg, 'ok:0', 'ok:0', 'ok:' || n_o_all, 'ok:0']);
    perform pg_temp.t('lê o histórico de alterações de RH (só consultor e dono)', i, 'select 1 from public.rede_historico where entidade like ''rede_rh_%''', array['ok:' || n_h, 'ok:0', 'ok:0', 'ok:0', 'ok:0', 'ok:' || n_h, 'ok:0']);
    for r in select unnest(array['rede_rh_colaboradores', 'rede_rh_quadro_previsto', 'rede_rh_mensal', 'rede_rh_ocorrencias']) loop
      perform pg_temp.t('não vê a outra empresa em ' || r, i, format('select 1 from public.%I where tenant_id = %L', r, tb), e_zero);
    end loop;

    -- ---------------------------------------------------------------- escrita: colaboradores e quadro previsto (módulo rh_quadro)
    perform pg_temp.t('cadastra colaborador no Brooklyn', i, format($q$insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (%L, %L, 'Novo Bro %s', 'atendente', date '2026-11-02')$q$, ta, a_bro, i), e_q_ins);
    perform pg_temp.t('cadastra colaborador na Vila Mariana', i, format($q$insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (%L, %L, 'Novo Vil %s', 'atendente', date '2026-11-02')$q$, ta, a_vil, i), e_q_ins);
    perform pg_temp.t('cadastra colaborador em loja da outra empresa', i, format($q$insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (%L, %L, 'Novo Alheio %s', 'atendente', date '2026-11-02')$q$, tb, b_bro, i), e_neg);
    perform pg_temp.t('edita colaborador do Brooklyn', i, format($q$update public.rede_rh_colaboradores set observacoes = 'editado' where id = %L$q$, c_bro), e_q_upd);
    perform pg_temp.t('desliga colaborador da Vila Mariana', i, format($q$update public.rede_rh_colaboradores set status = 'desligado', data_desligamento = date '2026-11-10' where id = %L$q$, c_vil), e_q_upd);
    perform pg_temp.t('define previsto do Brooklyn', i, format($q$insert into public.rede_rh_quadro_previsto (tenant_id, loja_id, cargo, previsto) values (%L, %L, 'gerente_loja', 1)$q$, ta, a_bro), e_q_ins);
    perform pg_temp.t('altera previsto do Brooklyn', i, format($q$update public.rede_rh_quadro_previsto set previsto = 5 where loja_id = %L and cargo = 'atendente'$q$, a_bro), e_q_upd);

    -- ---------------------------------------------------------------- escrita: lançamento mensal (módulo rh_movimentos)
    perform pg_temp.t('lança mês no Brooklyn', i, format($q$insert into public.rede_rh_mensal (tenant_id, loja_id, mes, headcount_medio, admissoes, desligamentos, dias_falta, dias_previstos) values (%L, %L, %L, 12, 1, 0, 3, 312)$q$, ta, a_bro, mes2), e_r_ins_reg);
    perform pg_temp.t('lança mês na Vila Mariana', i, format($q$insert into public.rede_rh_mensal (tenant_id, loja_id, mes, headcount_medio, admissoes, desligamentos, dias_falta, dias_previstos) values (%L, %L, %L, 12, 1, 0, 3, 312)$q$, ta, a_vil, mes2), e_r_ins_vil);
    perform pg_temp.t('lança mês em loja da outra empresa', i, format($q$insert into public.rede_rh_mensal (tenant_id, loja_id, mes, headcount_medio, dias_previstos) values (%L, %L, %L, 12, 312)$q$, tb, b_bro, mes2), e_neg);
    perform pg_temp.t('corrige mês do Brooklyn', i, format($q$update public.rede_rh_mensal set dias_falta = 4 where loja_id = %L and mes = %L$q$, a_bro, mes1), e_r_upd_reg);
    perform pg_temp.t('corrige mês da Vila Mariana', i, format($q$update public.rede_rh_mensal set dias_falta = 4 where loja_id = %L and mes = %L$q$, a_vil, mes1), e_r_upd_vil);

    -- ---------------------------------------------------------------- escrita: ocorrências (módulo rh_ocorrencias)
    perform pg_temp.t('registra ocorrência no Brooklyn', i, format($q$insert into public.rede_rh_ocorrencias (tenant_id, loja_id, colaborador_id, tipo, data, motivo) values (%L, %L, %L, 'atraso', date '2026-11-05', 'Chegou 20 min depois')$q$, ta, a_bro, c_bro), e_r_ins_reg);
    perform pg_temp.t('registra ocorrência na Vila Mariana', i, format($q$insert into public.rede_rh_ocorrencias (tenant_id, loja_id, colaborador_id, tipo, data, motivo) values (%L, %L, %L, 'atraso', date '2026-11-05', 'Chegou 20 min depois')$q$, ta, a_vil, c_vil), e_r_ins_vil);
    perform pg_temp.t('atualiza status da ocorrência do Brooklyn', i, format($q$update public.rede_rh_ocorrencias set status = 'assinada' where id = %L$q$, o_bro), e_r_upd_reg);
    perform pg_temp.t('atualiza status da ocorrência da Vila Mariana', i, format($q$update public.rede_rh_ocorrencias set status = 'assinada' where colaborador_id = %L$q$, c_vil), e_r_upd_vil2);

    -- ---------------------------------------------------------------- exclusão
    perform pg_temp.t('exclui lançamento do Brooklyn', i, format($q$delete from public.rede_rh_mensal where loja_id = %L and mes = %L$q$, a_bro, mes1), e_r_upd_reg);
    perform pg_temp.t('exclui lançamento da Vila Mariana', i, format($q$delete from public.rede_rh_mensal where loja_id = %L and mes = %L$q$, a_vil, mes1), e_r_upd_vil);
    perform pg_temp.t('exclui ocorrência do Brooklyn', i, format($q$delete from public.rede_rh_ocorrencias where id = %L$q$, o_bro), e_r_upd_reg);
    perform pg_temp.t('exclui ocorrência da Vila Mariana', i, format($q$delete from public.rede_rh_ocorrencias where colaborador_id = %L$q$, c_vil), e_r_upd_vil2);
    perform pg_temp.t('exclui previsto do Brooklyn', i, format($q$delete from public.rede_rh_quadro_previsto where loja_id = %L and cargo = 'atendente'$q$, a_bro), e_q_upd);
    perform pg_temp.t('exclui colaborador da Perdizes (com ocorrência: o banco recusa)', i, format($q$delete from public.rede_rh_colaboradores where id = %L$q$, c_per), array['erro:23503','ok:0','ok:0','ok:0','ok:0','erro:23503','ok:0']);

    -- ---------------------------------------------------------------- limpeza do cenário (tudo o que o teste criou nasceu no instante desta transação)
    delete from public.rede_rh_ocorrencias where created_at = now() and tenant_id = ta;
    delete from public.rede_rh_mensal where created_at = now() and tenant_id = ta;
    delete from public.rede_rh_quadro_previsto where created_at = now() and tenant_id = ta;
    delete from public.rede_rh_colaboradores where created_at = now() and tenant_id = ta;
  end loop;

  -- ---------------------------------------------------------------- visitante sem login
  for r in select unnest(array['rede_rh_colaboradores', 'rede_rh_quadro_previsto', 'rede_rh_mensal', 'rede_rh_ocorrencias']) loop
    perform pg_temp.chk('visitante sem login não lê ' || r, case when pg_temp.como_anon(format('select 1 from public.%I', r)) in ('ok:0', 'erro:42501') then 'barrado' else 'VAZOU' end, 'barrado');
    perform pg_temp.chk('visitante sem login não grava em ' || r, case when pg_temp.como_anon(format('delete from public.%I', r)) in ('ok:0', 'erro:42501') then 'barrado' else 'VAZOU' end, 'barrado');
  end loop;

  -- ---------------------------------------------------------------- integridade (como dono do banco)
  update public.tenant_members set role = 'owner' where user_id = u and tenant_id = ta;
  insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (ta, a_tat, 'Maria Integra', 'atendente', date '2026-03-01') returning id into c_x;
  insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (ta, a_per, 'João Integra', 'chefe_cozinha', date '2026-03-01') returning id into c_y;
  insert into public.rede_rh_ocorrencias (tenant_id, loja_id, colaborador_id, tipo, data, motivo) values (ta, a_tat, c_x, 'elogio', date '2026-04-01', 'Atendimento');

  perform pg_temp.chk('integridade: cargo inválido', pg_temp.tenta(format($q$insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (%L, %L, 'Cargo Ruim', 'diretor', date '2026-03-01')$q$, ta, a_tat)), 'erro:23514');
  perform pg_temp.chk('integridade: nome de 1 letra', pg_temp.tenta(format($q$insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (%L, %L, 'A', 'atendente', date '2026-03-01')$q$, ta, a_tat)), 'erro:23514');
  perform pg_temp.chk('integridade: desligado sem data de desligamento', pg_temp.tenta(format($q$insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao, status) values (%L, %L, 'Sem Data', 'atendente', date '2026-03-01', 'desligado')$q$, ta, a_tat)), 'erro:23514');
  perform pg_temp.chk('integridade: ativo com data de desligamento', pg_temp.tenta(format($q$insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao, data_desligamento) values (%L, %L, 'Com Data', 'atendente', date '2026-03-01', date '2026-04-01')$q$, ta, a_tat)), 'erro:23514');
  perform pg_temp.chk('integridade: desligamento antes da admissão', pg_temp.tenta(format($q$insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao, status, data_desligamento) values (%L, %L, 'Volta Tempo', 'atendente', date '2026-03-01', 'desligado', date '2026-02-01')$q$, ta, a_tat)), 'erro:23514');
  perform pg_temp.chk('integridade: motivo de desligamento em quem está ativo', pg_temp.tenta(format($q$insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao, motivo_desligamento) values (%L, %L, 'Motivo Ativo', 'atendente', date '2026-03-01', 'x')$q$, ta, a_tat)), 'erro:23514');
  perform pg_temp.chk('integridade: nome duplicado entre ativos da loja (ignora caixa e espaços)', pg_temp.tenta(format($q$insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (%L, %L, '  MARIA integra ', 'atendente', date '2026-03-05')$q$, ta, a_tat)), 'erro:23505');
  perform pg_temp.chk('integridade: mesmo nome em outra loja é permitido', pg_temp.tenta(format($q$insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (%L, %L, 'Maria Integra', 'atendente', date '2026-03-05')$q$, ta, a_vil)), 'ok');
  perform pg_temp.chk('integridade: nome de ex-colaborador pode ser reaproveitado', pg_temp.tenta(format($q$insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao, status, data_desligamento) values (%L, %L, 'Maria Integra', 'atendente', date '2025-01-01', 'desligado', date '2025-06-01')$q$, ta, a_tat)), 'ok');
  perform pg_temp.chk('integridade: colaborador de loja de outra empresa', pg_temp.tenta(format($q$insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (%L, %L, 'Cruzado', 'atendente', date '2026-03-01')$q$, ta, b_bro)), 'erro:23503');
  perform pg_temp.chk('integridade: a empresa do colaborador não muda', pg_temp.tenta(format($q$update public.rede_rh_colaboradores set tenant_id = %L where id = %L$q$, tb, c_y)), 'erro:23514');

  perform pg_temp.chk('integridade: ocorrência de colaborador de outra loja', pg_temp.tenta(format($q$insert into public.rede_rh_ocorrencias (tenant_id, loja_id, colaborador_id, tipo, data, motivo) values (%L, %L, %L, 'atraso', date '2026-05-01', 'x')$q$, ta, a_tat, c_y)), 'erro:23503');
  perform pg_temp.chk('integridade: tipo de ocorrência inválido', pg_temp.tenta(format($q$insert into public.rede_rh_ocorrencias (tenant_id, loja_id, colaborador_id, tipo, data, motivo) values (%L, %L, %L, 'bronca', date '2026-05-01', 'x')$q$, ta, a_tat, c_x)), 'erro:23514');
  perform pg_temp.chk('integridade: status de ocorrência inválido', pg_temp.tenta(format($q$insert into public.rede_rh_ocorrencias (tenant_id, loja_id, colaborador_id, tipo, data, motivo, status) values (%L, %L, %L, 'atraso', date '2026-05-01', 'x', 'pendente')$q$, ta, a_tat, c_x)), 'erro:23514');
  perform pg_temp.chk('integridade: ocorrência sem motivo', pg_temp.tenta(format($q$insert into public.rede_rh_ocorrencias (tenant_id, loja_id, colaborador_id, tipo, data, motivo) values (%L, %L, %L, 'atraso', date '2026-05-01', '   ')$q$, ta, a_tat, c_x)), 'erro:23514');
  perform pg_temp.chk('integridade: ocorrência antes da admissão', pg_temp.tenta(format($q$insert into public.rede_rh_ocorrencias (tenant_id, loja_id, colaborador_id, tipo, data, motivo) values (%L, %L, %L, 'atraso', date '2026-02-28', 'x')$q$, ta, a_tat, c_x)), 'erro:23514');
  perform pg_temp.chk('integridade: ocorrência no dia da admissão é aceita', pg_temp.tenta(format($q$insert into public.rede_rh_ocorrencias (tenant_id, loja_id, colaborador_id, tipo, data, motivo) values (%L, %L, %L, 'treinamento', date '2026-03-01', 'Integração')$q$, ta, a_tat, c_x)), 'ok');
  perform pg_temp.chk('integridade: ocorrência não troca de loja', pg_temp.tenta(format($q$update public.rede_rh_ocorrencias set loja_id = %L where colaborador_id = %L and tipo = 'elogio'$q$, a_vil, c_x)), 'erro:23514');
  perform pg_temp.chk('integridade: colaborador com ocorrência não troca de loja', pg_temp.tenta(format($q$update public.rede_rh_colaboradores set loja_id = %L where id = %L$q$, a_bro, c_x)), 'erro:23503');
  perform pg_temp.chk('integridade: colaborador sem ocorrência pode trocar de loja', pg_temp.tenta(format($q$update public.rede_rh_colaboradores set loja_id = %L where id = %L$q$, a_tat, c_y)), 'ok');
  perform pg_temp.chk('integridade: colaborador com ocorrência não pode ser excluído', pg_temp.tenta(format($q$delete from public.rede_rh_colaboradores where id = %L$q$, c_x)), 'erro:23503');
  perform pg_temp.chk('integridade: não dá para adiar a admissão para depois de uma ocorrência', pg_temp.tenta(format($q$update public.rede_rh_colaboradores set data_admissao = date '2026-06-01' where id = %L$q$, c_x)), 'erro:23514');
  perform pg_temp.chk('integridade: adiantar a admissão é permitido', pg_temp.tenta(format($q$update public.rede_rh_colaboradores set data_admissao = date '2026-02-01' where id = %L$q$, c_x)), 'ok');
  perform pg_temp.chk('integridade: colaborador sem ocorrência pode ser excluído', pg_temp.tenta(format($q$delete from public.rede_rh_colaboradores where id = %L$q$, c_y)), 'ok');

  perform pg_temp.chk('integridade: mês fora do dia 1', pg_temp.tenta(format($q$insert into public.rede_rh_mensal (tenant_id, loja_id, mes, headcount_medio, dias_previstos) values (%L, %L, date '2027-05-15', 10, 260)$q$, ta, a_tat)), 'erro:23514');
  perform pg_temp.chk('integridade: headcount zero', pg_temp.tenta(format($q$insert into public.rede_rh_mensal (tenant_id, loja_id, mes, headcount_medio, dias_previstos) values (%L, %L, date '2027-05-01', 0, 260)$q$, ta, a_tat)), 'erro:23514');
  perform pg_temp.chk('integridade: dias previstos zero', pg_temp.tenta(format($q$insert into public.rede_rh_mensal (tenant_id, loja_id, mes, headcount_medio, dias_previstos) values (%L, %L, date '2027-05-01', 10, 0)$q$, ta, a_tat)), 'erro:23514');
  perform pg_temp.chk('integridade: faltas acima dos dias previstos', pg_temp.tenta(format($q$insert into public.rede_rh_mensal (tenant_id, loja_id, mes, headcount_medio, dias_falta, dias_previstos) values (%L, %L, date '2027-05-01', 10, 261, 260)$q$, ta, a_tat)), 'erro:23514');
  perform pg_temp.chk('integridade: admissões negativas', pg_temp.tenta(format($q$insert into public.rede_rh_mensal (tenant_id, loja_id, mes, headcount_medio, admissoes, dias_previstos) values (%L, %L, date '2027-05-01', 10, -1, 260)$q$, ta, a_tat)), 'erro:23514');
  perform pg_temp.chk('integridade: mês antes de 2020', pg_temp.tenta(format($q$insert into public.rede_rh_mensal (tenant_id, loja_id, mes, headcount_medio, dias_previstos) values (%L, %L, date '2019-12-01', 10, 260)$q$, ta, a_tat)), 'erro:23514');
  perform pg_temp.chk('integridade: headcount com uma casa decimal é aceito', pg_temp.tenta(format($q$insert into public.rede_rh_mensal (tenant_id, loja_id, mes, headcount_medio, dias_previstos) values (%L, %L, date '2027-05-01', 10.5, 273)$q$, ta, a_tat)), 'ok');
  perform pg_temp.chk('integridade: um lançamento por loja e mês', pg_temp.tenta(format($q$insert into public.rede_rh_mensal (tenant_id, loja_id, mes, headcount_medio, dias_previstos) values (%L, %L, date '2027-05-01', 11, 286)$q$, ta, a_tat)), 'erro:23505');
  perform pg_temp.chk('integridade: o mês de um lançamento não muda', pg_temp.tenta(format($q$update public.rede_rh_mensal set mes = date '2027-06-01' where loja_id = %L and mes = date '2027-05-01'$q$, a_tat)), 'erro:23514');
  perform pg_temp.chk('integridade: a loja de um lançamento não muda', pg_temp.tenta(format($q$update public.rede_rh_mensal set loja_id = %L where loja_id = %L and mes = date '2027-05-01'$q$, a_vil, a_tat)), 'erro:23514');
  perform pg_temp.chk('integridade: lançamento em loja de outra empresa', pg_temp.tenta(format($q$insert into public.rede_rh_mensal (tenant_id, loja_id, mes, headcount_medio, dias_previstos) values (%L, %L, date '2027-07-01', 10, 260)$q$, ta, b_bro)), 'erro:23503');

  perform pg_temp.chk('integridade: previsto acima de 99', pg_temp.tenta(format($q$insert into public.rede_rh_quadro_previsto (tenant_id, loja_id, cargo, previsto) values (%L, %L, 'gerente_loja', 100)$q$, ta, a_tat)), 'erro:23514');
  perform pg_temp.chk('integridade: previsto negativo', pg_temp.tenta(format($q$insert into public.rede_rh_quadro_previsto (tenant_id, loja_id, cargo, previsto) values (%L, %L, 'gerente_loja', -1)$q$, ta, a_tat)), 'erro:23514');
  perform pg_temp.chk('integridade: previsto repetido para loja e cargo', pg_temp.tenta(format($q$insert into public.rede_rh_quadro_previsto (tenant_id, loja_id, cargo, previsto) values (%L, %L, 'chefe_cozinha', 2)$q$, ta, a_tat)), 'erro:23505');
  perform pg_temp.chk('integridade: o cargo de um previsto não muda', pg_temp.tenta(format($q$update public.rede_rh_quadro_previsto set cargo = 'gerente_loja' where loja_id = %L and cargo = 'chefe_cozinha'$q$, a_tat)), 'erro:23514');
  perform pg_temp.chk('integridade: previsto de loja de outra empresa', pg_temp.tenta(format($q$insert into public.rede_rh_quadro_previsto (tenant_id, loja_id, cargo, previsto) values (%L, %L, 'gerente_loja', 1)$q$, ta, b_bro)), 'erro:23503');

  perform pg_temp.chk('integridade: loja com RH cadastrado não pode ser excluída', pg_temp.tenta(format('delete from public.rede_lojas where id = %L', a_tat)), 'erro:23503');
  perform pg_temp.chk('integridade: as 4 tabelas têm RLS ligado', (select count(*)::text from pg_class where relnamespace = 'public'::regnamespace and relname in ('rede_rh_colaboradores', 'rede_rh_quadro_previsto', 'rede_rh_mensal', 'rede_rh_ocorrencias') and relrowsecurity), '4');
  perform pg_temp.chk('integridade: nenhuma coluna de CPF, salário ou documento', (select count(*)::text from information_schema.columns where table_schema = 'public' and table_name like 'rede\_rh\_%' and (column_name ~* 'cpf|salario|salário|remunera|documento|^rg$|^cid$')), '0');
  perform pg_temp.chk('integridade: nenhuma coluna de resultado calculado (turnover, absenteísmo, tempo de casa)', (select count(*)::text from information_schema.columns where table_schema = 'public' and table_name like 'rede\_rh\_%' and (column_name ~* 'turnover|absent|tempo_casa|percentual')), '0');
  perform pg_temp.chk('integridade: o gatilho de validação do colaborador não é executável de fora', (has_function_privilege('anon', 'public.rede_rh_colab_validar()', 'execute') or has_function_privilege('authenticated', 'public.rede_rh_colab_validar()', 'execute'))::text, 'false');
  perform pg_temp.chk('histórico: as quatro tabelas têm gatilho de histórico', (select count(distinct tgrelid::regclass::text)::text from pg_trigger where tgname in ('rede_rh_colaboradores_historico_trg', 'rede_rh_quadro_previsto_historico_trg', 'rede_rh_mensal_historico_trg', 'rede_rh_ocorrencias_historico_trg')), '4');
  perform pg_temp.chk('histórico: o que as pessoas gravaram ficou registrado', case when (select count(*) from public.rede_historico where entidade like 'rede\_rh\_%' and user_id = u) > 0 then 'sim' else 'não' end, 'sim');

  -- ---------------------------------------------------------------- resultado
  select count(*), count(*) filter (where not ok) into total, ruins from res;
  select string_agg(nome || ' → ' || detalhe, E'\n' order by nome) into falhas from res where not ok;
  if ruins = 0 then
    raise exception 'RLS_RH_OK % verificações, 0 falhas (nada foi gravado: o teste desfaz tudo)', total;
  else
    raise exception E'RLS_RH_FALHAS % de % verificações falharam:\n%', ruins, total, falhas;
  end if;
end
$test$;
