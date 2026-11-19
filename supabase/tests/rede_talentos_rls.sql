-- Rede de lojas, rodada 19 — teste das regras do banco de talentos (Nine Box, nota de liderança e critérios por cargo)
-- por perfil: RLS, isolamento entre empresas, restrições e gatilhos.
--
-- COMO USAR: cole no SQL Editor do Supabase (ou rode por psql) e execute. O teste NÃO deixa nada para trás:
-- cria dados de teste, simula cada perfil (consultor, diretoria, gerente regional, gerente de loja, sem acesso, dono, colaborador autorizado)
-- e termina de propósito com um erro (RAISE EXCEPTION), o que desfaz tudo.
-- O resultado aparece na mensagem desse erro: "RLS_TALENTOS_OK ..." = tudo certo; "RLS_TALENTOS_FALHAS ..." = lista o que falhou.
--
-- Pré-requisito: as empresas 'fat-buddha-demo' e 'fat-buddha' existem (com as 5 lojas) e a demonstração tem ao menos um membro.
-- Matriz esperada (rede_papel_modulo): avaliacao_gerentes, nine_box e sucessao → consultor vê e edita; diretoria e gerente regional só veem;
-- gerente de loja e colaborador não têm acesso. Dono da empresa vê e edita tudo.

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

-- Resultado exato (contagem de linhas ou código do erro).
create or replace function pg_temp.t(p_nome text, p_i int, p_sql text, p_esp text[]) returns void language plpgsql as $f$
begin
  perform pg_temp.chk('[' || (array['consultor','diretoria','gerente regional','gerente de loja','sem acesso','dono','colaborador'])[p_i + 1] || '] ' || p_nome,
    pg_temp.como(current_setting('t.u')::uuid, p_sql), p_esp[p_i + 1]);
end $f$;

-- Quando só importa se foi barrado ('erro'): o código varia conforme o gatilho de validação ou a regra de linha agir primeiro.
create or replace function pg_temp.t2(p_nome text, p_i int, p_sql text, p_esp text[]) returns void language plpgsql as $f$
declare r text;
begin
  r := pg_temp.como(current_setting('t.u')::uuid, p_sql);
  if r like 'erro:%' then r := 'erro'; end if;
  perform pg_temp.chk('[' || (array['consultor','diretoria','gerente regional','gerente de loja','sem acesso','dono','colaborador'])[p_i + 1] || '] ' || p_nome, r, p_esp[p_i + 1]);
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
  g_bro uuid; g_per uuid; g_vil uuid;
  c_bro uuid; c_per uuid; c_vil uuid;
  n_bro uuid; n_vil uuid; s_bro uuid;
  b_c uuid; b_g uuid;
  c_x uuid; c_y uuid; c_z uuid; g_x uuid; g_y uuid; g_z uuid;
  n_nb_all bigint; n_nb_reg bigint; n_nb_bro bigint; n_nb_vil bigint;
  n_ld_all bigint; n_ld_reg bigint; n_ld_bro bigint; n_ld_vil bigint;
  n_cr_all bigint;
  n_h bigint;
  falhas text; total int; ruins int;
  r text;
  -- ordem: consultor, diretoria, gerente regional (Brooklyn+Perdizes), gerente de loja (Brooklyn), sem acesso, dono, colaborador
  e_zero text[] := array['ok:0','ok:0','ok:0','ok:0','ok:0','ok:0','ok:0'];
  e_neg  text[] := array['erro','erro','erro','erro','erro','erro','erro'];
  -- gravar: só consultor e dono (os demais perfis são barrados, seja pela regra de linha ou pelo gatilho de validação)
  e_ins  text[] := array['ok:1','erro','erro','erro','erro','ok:1','erro'];
  -- alterar ou excluir o que existe: quem não pode gravar não enxerga a linha para alterar (0 linhas), nunca altera
  e_mut  text[] := array['ok:1','ok:0','ok:0','ok:0','ok:0','ok:1','ok:0'];
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

  -- Dados da outra empresa: ninguém da demonstração pode enxergar nem alterar.
  insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (tb, b_bro, 'Alheio Silva', 'atendente', date '2026-01-05') returning id into b_c;
  insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (tb, b_bro, 'Alheia Gerente', 'gerente_loja', date '2025-01-05') returning id into b_g;
  insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial) values (tb, b_bro, b_g, 3, 3);
  insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota) values (tb, b_bro, b_g, date '2026-10-01', 4.0);
  delete from public.rede_rh_criterios_cargo where tenant_id = tb and cargo = 'chefe_cozinha';
  insert into public.rede_rh_criterios_cargo (tenant_id, cargo, tempo_minimo_meses, criterio) values (tb, 'chefe_cozinha', 12, 'Critério da outra empresa');

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

    -- Preparo (como dono do banco): gerentes e atendentes de teste em três lojas, avaliações e notas de liderança já lançadas,
    -- pessoas sem avaliação (para os testes de gravação) e um colaborador desligado.
    insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao)
      select ta, l, 'Gerente Teste ' || i, 'gerente_loja', date '2026-01-10' from unnest(array[a_bro, a_per, a_vil]) l;
    insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao)
      select ta, l, 'Alvo Teste ' || i, 'atendente', date '2026-01-10' from unnest(array[a_bro, a_per, a_vil]) l;
    insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao)
      select ta, l, 'Novo Teste ' || i, 'atendente', date '2026-02-10' from unnest(array[a_bro, a_vil]) l;
    insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao, status, data_desligamento)
      values (ta, a_bro, 'Saiu Teste ' || i, 'atendente', date '2025-01-10', 'desligado', date '2026-06-01');
    select id into g_bro from public.rede_rh_colaboradores where loja_id = a_bro and nome = 'Gerente Teste ' || i;
    select id into g_per from public.rede_rh_colaboradores where loja_id = a_per and nome = 'Gerente Teste ' || i;
    select id into g_vil from public.rede_rh_colaboradores where loja_id = a_vil and nome = 'Gerente Teste ' || i;
    select id into c_bro from public.rede_rh_colaboradores where loja_id = a_bro and nome = 'Alvo Teste ' || i;
    select id into c_per from public.rede_rh_colaboradores where loja_id = a_per and nome = 'Alvo Teste ' || i;
    select id into c_vil from public.rede_rh_colaboradores where loja_id = a_vil and nome = 'Alvo Teste ' || i;
    select id into n_bro from public.rede_rh_colaboradores where loja_id = a_bro and nome = 'Novo Teste ' || i;
    select id into n_vil from public.rede_rh_colaboradores where loja_id = a_vil and nome = 'Novo Teste ' || i;
    select id into s_bro from public.rede_rh_colaboradores where loja_id = a_bro and nome = 'Saiu Teste ' || i;
    insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial)
      select ta, loja_id, id, 2, 2 from public.rede_rh_colaboradores where id in (c_bro, c_per, c_vil);
    insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota)
      select ta, loja_id, id, mes1, 3.5 from public.rede_rh_colaboradores where id in (g_bro, g_per, g_vil);
    delete from public.rede_rh_criterios_cargo where tenant_id = ta and cargo = 'gerente_loja';
    insert into public.rede_rh_criterios_cargo (tenant_id, cargo, tempo_minimo_meses, criterio) values (ta, 'atendente', 6, 'Critério de teste') on conflict (tenant_id, cargo) do nothing;

    select count(*) into n_nb_all from public.rede_rh_ninebox where tenant_id = ta;
    select count(*) into n_nb_reg from public.rede_rh_ninebox where loja_id in (a_bro, a_per);
    select count(*) into n_nb_bro from public.rede_rh_ninebox where loja_id = a_bro;
    select count(*) into n_nb_vil from public.rede_rh_ninebox where loja_id = a_vil;
    select count(*) into n_ld_all from public.rede_rh_lideranca where tenant_id = ta;
    select count(*) into n_ld_reg from public.rede_rh_lideranca where loja_id in (a_bro, a_per);
    select count(*) into n_ld_bro from public.rede_rh_lideranca where loja_id = a_bro;
    select count(*) into n_ld_vil from public.rede_rh_lideranca where loja_id = a_vil;
    select count(*) into n_cr_all from public.rede_rh_criterios_cargo where tenant_id = ta;
    select count(*) into n_h from public.rede_historico where tenant_id = ta and entidade in ('rede_rh_ninebox', 'rede_rh_lideranca', 'rede_rh_criterios_cargo');

    -- ---------------------------------------------------------------- leitura
    perform pg_temp.t('lê o Nine Box', i, 'select 1 from public.rede_rh_ninebox', array['ok:' || n_nb_all, 'ok:' || n_nb_all, 'ok:' || n_nb_reg, 'ok:0', 'ok:0', 'ok:' || n_nb_all, 'ok:0']);
    perform pg_temp.t('lê o Nine Box do Brooklyn', i, format('select 1 from public.rede_rh_ninebox where loja_id = %L', a_bro), array['ok:' || n_nb_bro, 'ok:' || n_nb_bro, 'ok:' || n_nb_bro, 'ok:0', 'ok:0', 'ok:' || n_nb_bro, 'ok:0']);
    perform pg_temp.t('lê o Nine Box da Vila Mariana (fora do acesso do regional)', i, format('select 1 from public.rede_rh_ninebox where loja_id = %L', a_vil), array['ok:' || n_nb_vil, 'ok:' || n_nb_vil, 'ok:0', 'ok:0', 'ok:0', 'ok:' || n_nb_vil, 'ok:0']);
    perform pg_temp.t('lê as notas de liderança', i, 'select 1 from public.rede_rh_lideranca', array['ok:' || n_ld_all, 'ok:' || n_ld_all, 'ok:' || n_ld_reg, 'ok:0', 'ok:0', 'ok:' || n_ld_all, 'ok:0']);
    perform pg_temp.t('lê as notas de liderança do Brooklyn', i, format('select 1 from public.rede_rh_lideranca where loja_id = %L', a_bro), array['ok:' || n_ld_bro, 'ok:' || n_ld_bro, 'ok:' || n_ld_bro, 'ok:0', 'ok:0', 'ok:' || n_ld_bro, 'ok:0']);
    perform pg_temp.t('lê as notas de liderança da Vila Mariana (fora do acesso do regional)', i, format('select 1 from public.rede_rh_lideranca where loja_id = %L', a_vil), array['ok:' || n_ld_vil, 'ok:' || n_ld_vil, 'ok:0', 'ok:0', 'ok:0', 'ok:' || n_ld_vil, 'ok:0']);
    perform pg_temp.t('lê os critérios por cargo (da empresa toda)', i, 'select 1 from public.rede_rh_criterios_cargo', array['ok:' || n_cr_all, 'ok:' || n_cr_all, 'ok:' || n_cr_all, 'ok:0', 'ok:0', 'ok:' || n_cr_all, 'ok:0']);
    perform pg_temp.t('lê o histórico do Nine Box, da liderança e dos critérios (só consultor e dono)', i, 'select 1 from public.rede_historico where entidade in (''rede_rh_ninebox'', ''rede_rh_lideranca'', ''rede_rh_criterios_cargo'')', array['ok:' || n_h, 'ok:0', 'ok:0', 'ok:0', 'ok:0', 'ok:' || n_h, 'ok:0']);
    for r in select unnest(array['rede_rh_ninebox', 'rede_rh_lideranca', 'rede_rh_criterios_cargo']) loop
      perform pg_temp.t('não vê a outra empresa em ' || r, i, format('select 1 from public.%I where tenant_id = %L', r, tb), e_zero);
    end loop;

    -- ---------------------------------------------------------------- escrita: Nine Box (módulo nine_box)
    perform pg_temp.t2('avalia no Nine Box no Brooklyn', i, format($q$insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial) values (%L, %L, %L, 3, 3)$q$, ta, a_bro, n_bro), e_ins);
    perform pg_temp.t2('avalia no Nine Box na Vila Mariana', i, format($q$insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial) values (%L, %L, %L, 3, 3)$q$, ta, a_vil, n_vil), e_ins);
    perform pg_temp.t2('avalia no Nine Box colaborador da outra empresa', i, format($q$insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial) values (%L, %L, %L, 3, 3)$q$, tb, b_bro, b_c), e_neg);
    perform pg_temp.t2('avalia no Nine Box quem saiu da empresa (sempre recusado)', i, format($q$insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial) values (%L, %L, %L, 3, 3)$q$, ta, a_bro, s_bro), e_neg);
    perform pg_temp.t('corrige avaliação do Brooklyn', i, format($q$update public.rede_rh_ninebox set desempenho = 3, potencial = 3 where colaborador_id = %L$q$, c_bro), e_mut);
    perform pg_temp.t('corrige avaliação da Vila Mariana', i, format($q$update public.rede_rh_ninebox set desempenho = 3 where colaborador_id = %L$q$, c_vil), e_mut);
    perform pg_temp.t('corrige avaliação da outra empresa', i, format($q$update public.rede_rh_ninebox set desempenho = 1 where tenant_id = %L$q$, tb), e_zero);
    perform pg_temp.t('exclui avaliação do Brooklyn', i, format($q$delete from public.rede_rh_ninebox where colaborador_id = %L$q$, c_bro), e_mut);
    perform pg_temp.t('exclui avaliação da Vila Mariana', i, format($q$delete from public.rede_rh_ninebox where colaborador_id = %L$q$, c_vil), e_mut);
    perform pg_temp.t('exclui avaliação da outra empresa', i, format($q$delete from public.rede_rh_ninebox where tenant_id = %L$q$, tb), e_zero);

    -- ---------------------------------------------------------------- escrita: nota de liderança (módulo avaliacao_gerentes)
    perform pg_temp.t2('lança liderança no Brooklyn', i, format($q$insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota) values (%L, %L, %L, %L, 4.5)$q$, ta, a_bro, g_bro, mes2), e_ins);
    perform pg_temp.t2('lança liderança na Vila Mariana', i, format($q$insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota) values (%L, %L, %L, %L, 4.5)$q$, ta, a_vil, g_vil, mes2), e_ins);
    perform pg_temp.t2('lança liderança de gerente da outra empresa', i, format($q$insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota) values (%L, %L, %L, %L, 4.5)$q$, tb, b_bro, b_g, mes2), e_neg);
    perform pg_temp.t('corrige liderança do Brooklyn', i, format($q$update public.rede_rh_lideranca set nota = 4.0 where colaborador_id = %L and mes = %L$q$, g_bro, mes1), e_mut);
    perform pg_temp.t('corrige liderança da Vila Mariana', i, format($q$update public.rede_rh_lideranca set nota = 4.0 where colaborador_id = %L and mes = %L$q$, g_vil, mes1), e_mut);
    perform pg_temp.t('corrige liderança da outra empresa', i, format($q$update public.rede_rh_lideranca set nota = 1.0 where tenant_id = %L$q$, tb), e_zero);
    perform pg_temp.t('exclui liderança do Brooklyn', i, format($q$delete from public.rede_rh_lideranca where colaborador_id = %L and mes = %L$q$, g_bro, mes1), e_mut);
    perform pg_temp.t('exclui liderança da Vila Mariana', i, format($q$delete from public.rede_rh_lideranca where colaborador_id = %L and mes = %L$q$, g_vil, mes1), e_mut);
    perform pg_temp.t('exclui liderança da outra empresa', i, format($q$delete from public.rede_rh_lideranca where tenant_id = %L$q$, tb), e_zero);

    -- ---------------------------------------------------------------- escrita: critérios por cargo (módulo sucessao, empresa toda)
    perform pg_temp.t2('define critério de cargo', i, format($q$insert into public.rede_rh_criterios_cargo (tenant_id, cargo, tempo_minimo_meses, criterio) values (%L, 'gerente_loja', 24, 'Dois anos')$q$, ta), e_ins);
    perform pg_temp.t2('define critério na outra empresa', i, format($q$insert into public.rede_rh_criterios_cargo (tenant_id, cargo, tempo_minimo_meses, criterio) values (%L, 'gerente_loja', 24, 'Dois anos')$q$, tb), e_neg);
    perform pg_temp.t('altera critério de cargo', i, format($q$update public.rede_rh_criterios_cargo set tempo_minimo_meses = 9 where tenant_id = %L and cargo = 'atendente'$q$, ta), e_mut);
    perform pg_temp.t('altera critério da outra empresa', i, format($q$update public.rede_rh_criterios_cargo set tempo_minimo_meses = 1 where tenant_id = %L$q$, tb), e_zero);
    perform pg_temp.t('restaura (exclui) critério de cargo', i, format($q$delete from public.rede_rh_criterios_cargo where tenant_id = %L and cargo = 'atendente'$q$, ta), e_mut);
    perform pg_temp.t('exclui critério da outra empresa', i, format($q$delete from public.rede_rh_criterios_cargo where tenant_id = %L$q$, tb), e_zero);

    -- ---------------------------------------------------------------- limpeza do cenário (tudo o que o teste criou nasceu no instante desta transação)
    delete from public.rede_rh_criterios_cargo where created_at = now() and tenant_id = ta;
    delete from public.rede_rh_ninebox where created_at = now() and tenant_id = ta;
    delete from public.rede_rh_lideranca where created_at = now() and tenant_id = ta;
    delete from public.rede_rh_colaboradores where created_at = now() and tenant_id = ta;
  end loop;

  -- ---------------------------------------------------------------- visitante sem login
  for r in select unnest(array['rede_rh_ninebox', 'rede_rh_lideranca', 'rede_rh_criterios_cargo']) loop
    perform pg_temp.chk('visitante sem login não lê ' || r, case when pg_temp.como_anon(format('select 1 from public.%I', r)) in ('ok:0', 'erro:42501') then 'barrado' else 'VAZOU' end, 'barrado');
    perform pg_temp.chk('visitante sem login não grava em ' || r, case when pg_temp.como_anon(format('delete from public.%I', r)) in ('ok:0', 'erro:42501') then 'barrado' else 'VAZOU' end, 'barrado');
  end loop;

  -- ---------------------------------------------------------------- integridade (como dono do banco)
  update public.tenant_members set role = 'owner' where user_id = u and tenant_id = ta;
  insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (ta, a_tat, 'Ativa Integra', 'atendente', date '2026-03-01') returning id into c_x;
  insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (ta, a_tat, 'Outra Ativa Integra', 'atendente', date '2026-03-01') returning id into c_y;
  insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (ta, a_tat, 'Vira Ex Integra', 'atendente', date '2026-03-01') returning id into c_z;
  insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (ta, a_tat, 'Gerente Integra', 'gerente_loja', date '2026-03-10') returning id into g_x;
  insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao, status, data_desligamento) values (ta, a_per, 'Gerente Saiu Integra', 'gerente_loja', date '2026-03-01', 'desligado', date '2027-03-15') returning id into g_y;
  insert into public.rede_rh_colaboradores (tenant_id, loja_id, nome, cargo, data_admissao) values (ta, a_tat, 'Gerente Cascata Integra', 'gerente_loja', date '2026-03-10') returning id into g_z;

  -- Nine Box
  perform pg_temp.chk('nine box: desempenho 0', pg_temp.tenta(format($q$insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial) values (%L, %L, %L, 0, 2)$q$, ta, a_tat, c_x)), 'erro:23514');
  perform pg_temp.chk('nine box: desempenho 4', pg_temp.tenta(format($q$insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial) values (%L, %L, %L, 4, 2)$q$, ta, a_tat, c_x)), 'erro:23514');
  perform pg_temp.chk('nine box: potencial 0', pg_temp.tenta(format($q$insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial) values (%L, %L, %L, 2, 0)$q$, ta, a_tat, c_x)), 'erro:23514');
  perform pg_temp.chk('nine box: potencial 4', pg_temp.tenta(format($q$insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial) values (%L, %L, %L, 2, 4)$q$, ta, a_tat, c_x)), 'erro:23514');
  perform pg_temp.chk('nine box: observação com mais de 500 caracteres', pg_temp.tenta(format($q$insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial, observacoes) values (%L, %L, %L, 2, 2, repeat('x', 501))$q$, ta, a_tat, c_x)), 'erro:23514');
  perform pg_temp.chk('nine box: origem inválida', pg_temp.tenta(format($q$insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial, origem) values (%L, %L, %L, 2, 2, 'importado')$q$, ta, a_tat, c_x)), 'erro:23514');
  perform pg_temp.chk('nine box: avaliação válida é aceita', pg_temp.tenta(format($q$insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial) values (%L, %L, %L, 3, 2)$q$, ta, a_tat, c_x)), 'ok');
  perform pg_temp.chk('nine box: uma avaliação por colaborador', pg_temp.tenta(format($q$insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial) values (%L, %L, %L, 1, 1)$q$, ta, a_tat, c_x)), 'erro:23505');
  perform pg_temp.chk('nine box: colaborador desligado não é avaliado', pg_temp.tenta(format($q$insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial) values (%L, %L, %L, 2, 2)$q$, ta, a_per, g_y)), 'erro:23514');
  perform pg_temp.chk('nine box: loja diferente da do colaborador é recusada', pg_temp.tenta(format($q$insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial) values (%L, %L, %L, 2, 2)$q$, ta, a_vil, c_y)), 'erro:23514');
  perform pg_temp.chk('nine box: loja de outra empresa é recusada', pg_temp.tenta(format($q$insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial) values (%L, %L, %L, 2, 2)$q$, ta, b_bro, c_y)), 'erro:23514');
  perform pg_temp.chk('nine box: a avaliação não troca de colaborador', pg_temp.tenta(format($q$update public.rede_rh_ninebox set colaborador_id = %L where colaborador_id = %L$q$, c_y, c_x)), 'erro:23514');
  perform pg_temp.chk('nine box: a avaliação não troca de empresa', pg_temp.tenta(format($q$update public.rede_rh_ninebox set tenant_id = %L where colaborador_id = %L$q$, tb, c_x)), 'erro:23514');
  insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial, observacoes) values (ta, a_tat, c_z, 2, 2, 'antes de sair');
  update public.rede_rh_colaboradores set status = 'desligado', data_desligamento = date '2026-08-01' where id = c_z;
  perform pg_temp.chk('nine box: quem saiu mantém a nota já gravada (histórico)', (select count(*)::text from public.rede_rh_ninebox where colaborador_id = c_z), '1');
  perform pg_temp.chk('nine box: quem saiu não muda de nota', pg_temp.tenta(format($q$update public.rede_rh_ninebox set desempenho = 3 where colaborador_id = %L$q$, c_z)), 'erro:23514');
  perform pg_temp.chk('nine box: quem saiu pode ter só a observação ajustada', pg_temp.tenta(format($q$update public.rede_rh_ninebox set observacoes = 'ajuste' where colaborador_id = %L$q$, c_z)), 'ok');
  update public.rede_rh_colaboradores set loja_id = a_vil where id = c_y;
  insert into public.rede_rh_ninebox (tenant_id, loja_id, colaborador_id, desempenho, potencial) values (ta, a_vil, c_y, 2, 3);
  update public.rede_rh_colaboradores set loja_id = a_bro where id = c_y;
  perform pg_temp.chk('nine box: a avaliação acompanha o colaborador que muda de loja', (select loja_id::text from public.rede_rh_ninebox where colaborador_id = c_y), a_bro::text);
  delete from public.rede_rh_colaboradores where id = c_y;
  perform pg_temp.chk('nine box: excluir o cadastro exclui a avaliação junto', (select count(*)::text from public.rede_rh_ninebox where colaborador_id = c_y), '0');

  -- Nota de liderança
  perform pg_temp.chk('liderança: nota acima de 5', pg_temp.tenta(format($q$insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota) values (%L, %L, %L, date '2026-05-01', 5.1)$q$, ta, a_tat, g_x)), 'erro:23514');
  perform pg_temp.chk('liderança: nota negativa', pg_temp.tenta(format($q$insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota) values (%L, %L, %L, date '2026-05-01', -0.1)$q$, ta, a_tat, g_x)), 'erro:23514');
  perform pg_temp.chk('liderança: nota 10 não cabe na coluna', pg_temp.tenta(format($q$insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota) values (%L, %L, %L, date '2026-05-01', 10)$q$, ta, a_tat, g_x)), 'erro:22003');
  perform pg_temp.chk('liderança: mês fora do dia 1', pg_temp.tenta(format($q$insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota) values (%L, %L, %L, date '2026-05-15', 4)$q$, ta, a_tat, g_x)), 'erro:23514');
  perform pg_temp.chk('liderança: mês antes de 2020', pg_temp.tenta(format($q$insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota) values (%L, %L, %L, date '2019-12-01', 4)$q$, ta, a_tat, g_x)), 'erro:23514');
  perform pg_temp.chk('liderança: observação com mais de 500 caracteres', pg_temp.tenta(format($q$insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota, observacoes) values (%L, %L, %L, date '2026-05-01', 4, repeat('x', 501))$q$, ta, a_tat, g_x)), 'erro:23514');
  perform pg_temp.chk('liderança: origem inválida', pg_temp.tenta(format($q$insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota, origem) values (%L, %L, %L, date '2026-05-01', 4, 'importado')$q$, ta, a_tat, g_x)), 'erro:23514');
  perform pg_temp.chk('liderança: só para gerente de loja', pg_temp.tenta(format($q$insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota) values (%L, %L, %L, date '2026-05-01', 4)$q$, ta, a_tat, c_x)), 'erro:23514');
  perform pg_temp.chk('liderança: mês anterior à admissão do gerente', pg_temp.tenta(format($q$insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota) values (%L, %L, %L, date '2026-02-01', 4)$q$, ta, a_tat, g_x)), 'erro:23514');
  perform pg_temp.chk('liderança: o mês da admissão é aceito', pg_temp.tenta(format($q$insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota) values (%L, %L, %L, date '2026-03-01', 4.5)$q$, ta, a_tat, g_x)), 'ok');
  perform pg_temp.chk('liderança: uma nota por gerente e mês', pg_temp.tenta(format($q$insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota) values (%L, %L, %L, date '2026-03-01', 2)$q$, ta, a_tat, g_x)), 'erro:23505');
  perform pg_temp.chk('liderança: o mês do desligamento é aceito', pg_temp.tenta(format($q$insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota) values (%L, %L, %L, date '2027-03-01', 3)$q$, ta, a_per, g_y)), 'ok');
  perform pg_temp.chk('liderança: mês posterior ao desligamento', pg_temp.tenta(format($q$insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota) values (%L, %L, %L, date '2027-04-01', 3)$q$, ta, a_per, g_y)), 'erro:23514');
  perform pg_temp.chk('liderança: loja de outra empresa é recusada', pg_temp.tenta(format($q$insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota) values (%L, %L, %L, date '2026-06-01', 3)$q$, ta, b_bro, g_x)), 'erro:23514');
  perform pg_temp.chk('liderança: o mês de uma nota não muda', pg_temp.tenta(format($q$update public.rede_rh_lideranca set mes = date '2026-04-01' where colaborador_id = %L and mes = date '2026-03-01'$q$, g_x)), 'erro:23514');
  perform pg_temp.chk('liderança: o gerente de uma nota não muda', pg_temp.tenta(format($q$update public.rede_rh_lideranca set colaborador_id = %L where colaborador_id = %L and mes = date '2026-03-01'$q$, g_z, g_x)), 'erro:23514');
  perform pg_temp.chk('liderança: a nota do mês pode ser corrigida', pg_temp.tenta(format($q$update public.rede_rh_lideranca set nota = 2.5 where colaborador_id = %L and mes = date '2026-03-01'$q$, g_x)), 'ok');
  insert into public.rede_rh_lideranca (tenant_id, loja_id, colaborador_id, mes, nota) values (ta, a_tat, g_z, date '2026-04-01', 4);
  delete from public.rede_rh_colaboradores where id = g_z;
  perform pg_temp.chk('liderança: excluir o cadastro exclui as notas junto', (select count(*)::text from public.rede_rh_lideranca where colaborador_id = g_z), '0');

  -- Critérios por cargo
  perform pg_temp.chk('critério: cargo inválido', pg_temp.tenta(format($q$insert into public.rede_rh_criterios_cargo (tenant_id, cargo, tempo_minimo_meses, criterio) values (%L, 'diretor', 6, 'x')$q$, ta)), 'erro:23514');
  perform pg_temp.chk('critério: tempo mínimo negativo', pg_temp.tenta(format($q$insert into public.rede_rh_criterios_cargo (tenant_id, cargo, tempo_minimo_meses, criterio) values (%L, 'chefe_cozinha', -1, 'x')$q$, ta)), 'erro:23514');
  perform pg_temp.chk('critério: tempo mínimo acima de 120 meses', pg_temp.tenta(format($q$insert into public.rede_rh_criterios_cargo (tenant_id, cargo, tempo_minimo_meses, criterio) values (%L, 'chefe_cozinha', 121, 'x')$q$, ta)), 'erro:23514');
  perform pg_temp.chk('critério: texto em branco', pg_temp.tenta(format($q$insert into public.rede_rh_criterios_cargo (tenant_id, cargo, tempo_minimo_meses, criterio) values (%L, 'chefe_cozinha', 6, '   ')$q$, ta)), 'erro:23514');
  perform pg_temp.chk('critério: texto com mais de 500 caracteres', pg_temp.tenta(format($q$insert into public.rede_rh_criterios_cargo (tenant_id, cargo, tempo_minimo_meses, criterio) values (%L, 'chefe_cozinha', 6, repeat('x', 501))$q$, ta)), 'erro:23514');
  perform pg_temp.chk('critério: origem inválida', pg_temp.tenta(format($q$insert into public.rede_rh_criterios_cargo (tenant_id, cargo, tempo_minimo_meses, criterio, origem) values (%L, 'chefe_cozinha', 6, 'x', 'importado')$q$, ta)), 'erro:23514');
  perform pg_temp.chk('critério: empresa inexistente', pg_temp.tenta($q$insert into public.rede_rh_criterios_cargo (tenant_id, cargo, tempo_minimo_meses, criterio) values (gen_random_uuid(), 'chefe_cozinha', 6, 'x')$q$), 'erro:23503');
  perform pg_temp.chk('critério: válido é aceito', pg_temp.tenta(format($q$insert into public.rede_rh_criterios_cargo (tenant_id, cargo, tempo_minimo_meses, criterio) values (%L, 'chefe_cozinha', 12, 'Doze meses')$q$, ta)), 'ok');
  perform pg_temp.chk('critério: um por empresa e cargo', pg_temp.tenta(format($q$insert into public.rede_rh_criterios_cargo (tenant_id, cargo, tempo_minimo_meses, criterio) values (%L, 'chefe_cozinha', 8, 'Oito')$q$, ta)), 'erro:23505');
  perform pg_temp.chk('critério: o mesmo cargo em outra empresa é permitido', pg_temp.tenta(format($q$insert into public.rede_rh_criterios_cargo (tenant_id, cargo, tempo_minimo_meses, criterio) values (%L, 'atendente', 4, 'Quatro')$q$, tb)), 'ok');
  perform pg_temp.chk('critério: sem tempo mínimo é aceito (supervisor regional)', pg_temp.tenta(format($q$insert into public.rede_rh_criterios_cargo (tenant_id, cargo, tempo_minimo_meses, criterio) values (%L, 'supervisor_regional', null, 'Sem exigência')$q$, ta)), 'ok');
  perform pg_temp.chk('critério: a empresa de um critério não muda', pg_temp.tenta(format($q$update public.rede_rh_criterios_cargo set tenant_id = %L where tenant_id = %L and cargo = 'chefe_cozinha'$q$, tb, ta)), 'erro:23514');
  perform pg_temp.chk('critério: o cargo de um critério não muda', pg_temp.tenta(format($q$update public.rede_rh_criterios_cargo set cargo = 'gerente_loja' where tenant_id = %L and cargo = 'chefe_cozinha'$q$, ta)), 'erro:23514');

  -- Estrutura e privacidade
  perform pg_temp.chk('estrutura: as 3 tabelas têm RLS ligado', (select count(*)::text from pg_class where relnamespace = 'public'::regnamespace and relname in ('rede_rh_ninebox', 'rede_rh_lideranca', 'rede_rh_criterios_cargo') and relrowsecurity), '3');
  perform pg_temp.chk('estrutura: 4 regras (ver, criar, alterar, excluir) em cada tabela', (select count(*)::text from pg_policies where schemaname = 'public' and tablename in ('rede_rh_ninebox', 'rede_rh_lideranca', 'rede_rh_criterios_cargo')), '12');
  perform pg_temp.chk('estrutura: nenhuma regra libera para visitante (anon) ou público', (select count(*)::text from pg_policies where schemaname = 'public' and tablename in ('rede_rh_ninebox', 'rede_rh_lideranca', 'rede_rh_criterios_cargo') and (roles::text ~ 'anon|public')), '0');
  perform pg_temp.chk('estrutura: nenhuma coluna de resultado calculado (score, quadrante, prontidão, risco, turnover, absenteísmo)', (select count(*)::text from information_schema.columns where table_schema = 'public' and table_name in ('rede_rh_ninebox', 'rede_rh_lideranca', 'rede_rh_criterios_cargo') and column_name ~* 'score|quadrante|prontid|risco|turnover|absent|percentual|tempo_casa'), '0');
  perform pg_temp.chk('privacidade: nenhuma coluna de CPF, salário ou documento', (select count(*)::text from information_schema.columns where table_schema = 'public' and table_name in ('rede_rh_ninebox', 'rede_rh_lideranca', 'rede_rh_criterios_cargo') and column_name ~* 'cpf|salario|salário|remunera|documento|^rg$|^cid$'), '0');
  perform pg_temp.chk('estrutura: os gatilhos de validação não são executáveis de fora', (has_function_privilege('anon', 'public.rede_rh_nb_validar()', 'execute') or has_function_privilege('authenticated', 'public.rede_rh_nb_validar()', 'execute') or has_function_privilege('anon', 'public.rede_rh_lid_validar()', 'execute') or has_function_privilege('authenticated', 'public.rede_rh_lid_validar()', 'execute'))::text, 'false');
  perform pg_temp.chk('histórico: as três tabelas têm gatilho de histórico', (select count(distinct tgrelid::regclass::text)::text from pg_trigger where tgname in ('rede_rh_ninebox_historico_trg', 'rede_rh_lideranca_historico_trg', 'rede_rh_criterios_cargo_historico_trg')), '3');
  perform pg_temp.chk('histórico: as avaliações que as pessoas gravaram ficaram registradas', case when (select count(*) from public.rede_historico where entidade = 'rede_rh_ninebox' and user_id = u and acao = 'insert') > 0 then 'sim' else 'não' end, 'sim');
  perform pg_temp.chk('histórico: a correção guarda o valor de antes e o de depois', case when (select count(*) from public.rede_historico where entidade = 'rede_rh_ninebox' and acao = 'update' and user_id = u and antes ? 'desempenho' and depois ? 'desempenho') > 0 then 'sim' else 'não' end, 'sim');
  perform pg_temp.chk('histórico: a exclusão guarda o que foi removido', case when (select count(*) from public.rede_historico where entidade = 'rede_rh_ninebox' and acao = 'delete' and user_id = u and antes ? 'desempenho') > 0 then 'sim' else 'não' end, 'sim');
  perform pg_temp.chk('histórico: as notas de liderança lançadas ficaram registradas', case when (select count(*) from public.rede_historico where entidade = 'rede_rh_lideranca' and user_id = u) > 0 then 'sim' else 'não' end, 'sim');
  perform pg_temp.chk('histórico: os critérios ajustados ficaram registrados', case when (select count(*) from public.rede_historico where entidade = 'rede_rh_criterios_cargo' and user_id = u) > 0 then 'sim' else 'não' end, 'sim');

  -- ---------------------------------------------------------------- resultado
  select count(*), count(*) filter (where not ok) into total, ruins from res;
  select string_agg(nome || ' → ' || detalhe, E'\n' order by nome) into falhas from res where not ok;
  if ruins = 0 then
    raise exception 'RLS_TALENTOS_OK % verificações, 0 falhas (nada foi gravado: o teste desfaz tudo)', total;
  else
    raise exception E'RLS_TALENTOS_FALHAS % de % verificações falharam:\n%', ruins, total, falhas;
  end if;
end
$test$;
