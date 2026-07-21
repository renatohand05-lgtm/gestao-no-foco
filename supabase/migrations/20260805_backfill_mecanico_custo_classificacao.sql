-- Backfill seguro de classificação em mecanico_custos (idempotente).
-- Só preenche quando houver EXATAMENTE um candidato inequívoco no tenant.
-- Não usa nome/código fixo (SALARIOS/X3) como regra — usa dre_linha único.
-- Registros ambíguos permanecem NULL e são reportados via RAISE NOTICE.

do $$
declare
  r record;
  v_cat uuid;
  v_plano uuid;
  v_cat_count int;
  v_plano_count int;
  v_updated_cat int := 0;
  v_updated_plano int := 0;
  v_remaining int := 0;
begin
  if to_regclass('public.mecanico_custos') is null then
    raise notice 'mecanico_custos inexistente — skip backfill';
    return;
  end if;

  for r in
    select c.id, c.tenant_id, c.mecanico_id,
           c.categoria_financeira_id, c.plano_conta_id, c.centro_custo_id
    from public.mecanico_custos c
    where c.deleted_at is null
      and (
        c.categoria_financeira_id is null
        or c.plano_conta_id is null
      )
  loop
    v_cat := r.categoria_financeira_id;
    v_plano := r.plano_conta_id;

    -- Categoria: único registro ativo com dre_linha = despesas_pessoal
    if v_cat is null and to_regclass('public.categorias_financeiras') is not null then
      select count(*) into v_cat_count
      from public.categorias_financeiras cf
      where cf.tenant_id = r.tenant_id
        and cf.deleted_at is null
        and coalesce(cf.ativo, true)
        and cf.dre_linha = 'despesas_pessoal';

      if v_cat_count = 1 then
        select cf.id into v_cat
        from public.categorias_financeiras cf
        where cf.tenant_id = r.tenant_id
          and cf.deleted_at is null
          and coalesce(cf.ativo, true)
          and cf.dre_linha = 'despesas_pessoal'
        limit 1;
      end if;
    end if;

    -- Plano: único registro ativo com dre_linha = despesas_pessoal
    if v_plano is null and to_regclass('public.plano_contas') is not null then
      select count(*) into v_plano_count
      from public.plano_contas pc
      where pc.tenant_id = r.tenant_id
        and pc.deleted_at is null
        and coalesce(pc.ativo, true)
        and pc.dre_linha = 'despesas_pessoal';

      if v_plano_count = 1 then
        select pc.id into v_plano
        from public.plano_contas pc
        where pc.tenant_id = r.tenant_id
          and pc.deleted_at is null
          and coalesce(pc.ativo, true)
          and pc.dre_linha = 'despesas_pessoal'
        limit 1;
      end if;
    end if;

    if v_cat is distinct from r.categoria_financeira_id
       or v_plano is distinct from r.plano_conta_id then
      update public.mecanico_custos
      set
        categoria_financeira_id = coalesce(categoria_financeira_id, v_cat),
        plano_conta_id = coalesce(plano_conta_id, v_plano),
        updated_at = now()
      where id = r.id;

      if r.categoria_financeira_id is null and v_cat is not null then
        v_updated_cat := v_updated_cat + 1;
      end if;
      if r.plano_conta_id is null and v_plano is not null then
        v_updated_plano := v_updated_plano + 1;
      end if;
    end if;

    if coalesce(v_cat, r.categoria_financeira_id) is null
       or coalesce(v_plano, r.plano_conta_id) is null then
      v_remaining := v_remaining + 1;
      raise notice
        'mecanico_custos % (tenant %, mecanico %) ainda sem classificação completa (cat=%, plano=%)',
        r.id, r.tenant_id, r.mecanico_id,
        coalesce(v_cat::text, 'NULL'),
        coalesce(v_plano::text, 'NULL');
    end if;
  end loop;

  raise notice
    'Backfill mecanico_custos: categorias preenchidas=%, planos preenchidos=%, ainda incompletos=%',
    v_updated_cat, v_updated_plano, v_remaining;
end;
$$;

-- Relatório final (consulta idempotente, só leitura)
do $$
declare
  v_incomplete int;
begin
  if to_regclass('public.mecanico_custos') is null then
    return;
  end if;
  select count(*) into v_incomplete
  from public.mecanico_custos
  where deleted_at is null
    and (
      categoria_financeira_id is null
      or plano_conta_id is null
      or centro_custo_id is null
    );
  raise notice 'mecanico_custos ainda incompletos após backfill: %', v_incomplete;
end;
$$;

notify pgrst, 'reload schema';
