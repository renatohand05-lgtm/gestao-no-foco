-- Sprint 36 — Plano de contas / categorias / centros de custo padrão POR SEGMENTO,
-- criados automaticamente na hora que a empresa nasce (todos os 10 valores de
-- tenants.segment: oficina, restaurante, comercio, consultoria, servicos, outro,
-- lava_rapido, barbearia, clinica_estetica, consultorio_odontologico).
--
-- Problema que resolve: hoje, uma empresa nova nasce com ZERO plano de contas,
-- ZERO categorias financeiras e ZERO centro de custo. Toda venda e toda despesa
-- lançada cai automaticamente em "Pendente de classificação" no DRE, porque não
-- existe nem categoria pra escolher. Isso exige intervenção manual (via chat)
-- para cada empresa nova — não escala.
--
-- O que este migration faz:
--   1) cria a função seed_tenant_financeiro_padrao(tenant_id, segment), idempotente
--      (só roda se o tenant ainda não tiver nenhum plano_contas — não sobrescreve
--      nem duplica configuração já feita manualmente, ex.: BenvindoCar / X company);
--   2) chama essa função automaticamente de dentro de create_tenant_with_owner,
--      então TODA empresa nova (onboarding web, master, etc.) já nasce pronta;
--   3) roda a função retroativamente pra empresas que já existem e ainda estão
--      zeradas (ex.: "Leo", "Danilos burger").
--
-- Execute manualmente no Supabase SQL Editor. Aditivo / idempotente / seguro
-- pra rodar mais de uma vez.

-- =============================================================================
-- 1) Função de seed por segmento
-- =============================================================================
create or replace function public.seed_tenant_financeiro_padrao(
  p_tenant_id uuid,
  p_segment text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_segment text := coalesce(nullif(trim(p_segment), ''), 'outro');

  -- nomes que variam por segmento
  v_receita1_nome text;
  v_receita2_nome text;
  v_receita3_nome text; -- opcional, alguns segmentos só têm 2
  v_cmv_nome text;

  -- ids gerados
  v_pc_receita1 uuid;
  v_pc_receita2 uuid;
  v_pc_receita3 uuid;
  v_pc_cmv uuid;
  v_pc_impostos uuid;
  v_pc_id uuid;
  v_cat_id uuid;

  -- catálogo genérico de despesas fixas/operacionais (igual em todos os
  -- segmentos — reaproveita o mesmo catálogo já aplicado manualmente em
  -- BenvindoCar / X company e via Sprint 34.9)
  v_codigo text[] := array[
    '2.2.01','2.2.02','2.2.03','2.2.04','2.2.05','2.2.06','2.2.07','2.2.08',
    '2.2.09','2.2.10','2.2.11','2.2.12','2.2.13','2.2.14',
    '2.3.01','2.3.02','2.3.03','2.3.04',
    '2.4.01'
  ];
  v_nome text[] := array[
    'Aluguel','Condomínio','Energia elétrica','Água / saneamento','Internet',
    'Telefonia','Contabilidade','Manutenção','Material de escritório',
    'Material de consumo / Copa','Seguros','Marketing / divulgação',
    'Software / assinaturas','Outras despesas operacionais',
    'Salários','Pró-labore','Benefícios / encargos','Comissões',
    'Despesas financeiras / tarifas bancárias'
  ];
  v_dre_linha text[] := array[
    'despesas_operacionais','despesas_operacionais','despesas_operacionais',
    'despesas_operacionais','despesas_operacionais','despesas_operacionais',
    'despesas_operacionais','despesas_operacionais','despesas_operacionais',
    'despesas_operacionais','despesas_operacionais','despesas_comerciais',
    'despesas_operacionais','despesas_operacionais',
    'despesas_pessoal','despesas_pessoal','despesas_pessoal','despesas_comerciais',
    'despesas_financeiras'
  ];
  v_dre_detalhe text[] := array[
    'locacao_aluguel','locacao_condominio','utilidades_energia',
    'utilidades_agua','utilidades_internet','utilidades_telefonia',
    'manutencao_contabilidade','manutencao_outras','admin_escritorio',
    'admin_copa','seguros_operacionais','comercial_marketing',
    'tech_assinaturas','opex_outras',
    'pessoal_salarios','pessoal_prolabore','pessoal_beneficios',
    'comercial_comissoes',
    null
  ];
  i int;
begin
  -- Idempotência: se o tenant já tem qualquer plano de contas, não mexe
  -- (evita sobrescrever configuração manual já feita).
  if exists (select 1 from public.plano_contas where tenant_id = p_tenant_id) then
    return;
  end if;

  -- ---------------------------------------------------------------------
  -- Nomenclatura de receita / CMV por segmento
  -- ---------------------------------------------------------------------
  case v_segment
    when 'oficina' then
      v_receita1_nome := 'Serviços de mecânica (mão de obra)';
      v_receita2_nome := 'Venda de peças';
      v_cmv_nome := 'Peças e insumos (CMV)';
    when 'lava_rapido' then
      v_receita1_nome := 'Serviços de lavagem / estética automotiva';
      v_receita2_nome := 'Venda de produtos automotivos';
      v_cmv_nome := 'Produtos e insumos (CMV)';
    when 'barbearia' then
      v_receita1_nome := 'Serviços de barbearia';
      v_receita2_nome := 'Venda de produtos (cosméticos)';
      v_cmv_nome := 'Produtos e insumos (CMV)';
    when 'consultoria' then
      v_receita1_nome := 'Honorários de consultoria';
      v_receita2_nome := 'Serviços avulsos';
      v_cmv_nome := 'Materiais e subcontratações (CMV)';
    when 'clinica_estetica' then
      v_receita1_nome := 'Procedimentos faciais / corporais';
      v_receita2_nome := 'Pacotes de sessões';
      v_receita3_nome := 'Venda de produtos';
      v_cmv_nome := 'Materiais e insumos (CMV)';
    when 'consultorio_odontologico' then
      v_receita1_nome := 'Consultas e procedimentos odontológicos';
      v_receita2_nome := 'Convênios / planos odontológicos';
      v_receita3_nome := 'Venda de produtos (clareamento, etc.)';
      v_cmv_nome := 'Materiais odontológicos (CMV)';
    when 'restaurante' then
      v_receita1_nome := 'Vendas de alimentos e bebidas';
      v_receita2_nome := 'Delivery';
      v_cmv_nome := 'Insumos e matéria-prima (CMV)';
    when 'comercio' then
      v_receita1_nome := 'Venda de produtos';
      v_cmv_nome := 'Mercadorias (CMV)';
    else -- 'servicos', 'outro' e qualquer valor não mapeado
      v_receita1_nome := 'Prestação de serviços';
      v_cmv_nome := 'Materiais e insumos (CMV)';
  end case;

  -- ---------------------------------------------------------------------
  -- Plano de contas — receita
  -- ---------------------------------------------------------------------
  insert into public.plano_contas (tenant_id, codigo, nome, tipo, dre_linha, dre_classificacao_origem)
  values (p_tenant_id, '1.1', v_receita1_nome, 'receita', 'receita_bruta', 'lote')
  returning id into v_pc_receita1;

  insert into public.categorias_financeiras (tenant_id, nome, tipo, plano_conta_id, dre_linha, dre_classificacao_origem)
  values (p_tenant_id, v_receita1_nome, 'receita', v_pc_receita1, 'receita_bruta', 'lote');

  if v_receita2_nome is not null then
    insert into public.plano_contas (tenant_id, codigo, nome, tipo, dre_linha, dre_classificacao_origem)
    values (p_tenant_id, '1.2', v_receita2_nome, 'receita', 'receita_bruta', 'lote')
    returning id into v_pc_receita2;

    insert into public.categorias_financeiras (tenant_id, nome, tipo, plano_conta_id, dre_linha, dre_classificacao_origem)
    values (p_tenant_id, v_receita2_nome, 'receita', v_pc_receita2, 'receita_bruta', 'lote');
  end if;

  if v_receita3_nome is not null then
    insert into public.plano_contas (tenant_id, codigo, nome, tipo, dre_linha, dre_classificacao_origem)
    values (p_tenant_id, '1.3', v_receita3_nome, 'receita', 'receita_bruta', 'lote')
    returning id into v_pc_receita3;

    insert into public.categorias_financeiras (tenant_id, nome, tipo, plano_conta_id, dre_linha, dre_classificacao_origem)
    values (p_tenant_id, v_receita3_nome, 'receita', v_pc_receita3, 'receita_bruta', 'lote');
  end if;

  -- Deduções (impostos sobre a venda) — conta separada, criada sem valor;
  -- o usuário lança o percentual real quando tiver o regime tributário dele.
  insert into public.plano_contas (tenant_id, codigo, nome, tipo, dre_linha, dre_classificacao_origem)
  values (p_tenant_id, '1.9', 'Impostos sobre a venda', 'receita', 'deducoes', 'lote')
  returning id into v_pc_impostos;

  insert into public.categorias_financeiras (tenant_id, nome, tipo, plano_conta_id, dre_linha, dre_classificacao_origem)
  values (p_tenant_id, 'Impostos sobre a venda', 'despesa', v_pc_impostos, 'deducoes', 'lote');

  -- ---------------------------------------------------------------------
  -- Plano de contas — CMV (custo direto do que é vendido/executado)
  -- ---------------------------------------------------------------------
  insert into public.plano_contas (tenant_id, codigo, nome, tipo, dre_linha, dre_classificacao_origem)
  values (p_tenant_id, '2.1', v_cmv_nome, 'despesa', 'cmv', 'lote')
  returning id into v_pc_cmv;

  insert into public.categorias_financeiras (tenant_id, nome, tipo, plano_conta_id, dre_linha, dre_classificacao_origem)
  values (p_tenant_id, v_cmv_nome, 'despesa', v_pc_cmv, 'cmv', 'lote');

  -- ---------------------------------------------------------------------
  -- Plano de contas + categorias — despesas fixas/operacionais (genérico,
  -- igual pra todos os segmentos, mesmo catálogo usado manualmente antes)
  -- ---------------------------------------------------------------------
  for i in 1 .. array_length(v_nome, 1) loop
    insert into public.plano_contas (tenant_id, codigo, nome, tipo, dre_linha, dre_classificacao_origem)
    values (p_tenant_id, v_codigo[i], v_nome[i], 'despesa', v_dre_linha[i], 'lote')
    returning id into v_pc_id;

    insert into public.categorias_financeiras (tenant_id, nome, tipo, plano_conta_id, dre_linha, dre_detalhe, dre_classificacao_origem)
    values (p_tenant_id, v_nome[i], 'despesa', v_pc_id, v_dre_linha[i], v_dre_detalhe[i], 'lote')
    returning id into v_cat_id;
  end loop;

  -- ---------------------------------------------------------------------
  -- Centros de custo — genéricos, iguais pra todos os segmentos
  -- ---------------------------------------------------------------------
  insert into public.centros_custo (tenant_id, codigo, nome)
  values
    (p_tenant_id, 'CC01', 'Operacional'),
    (p_tenant_id, 'CC02', 'Administrativo / Financeiro'),
    (p_tenant_id, 'CC03', 'Comercial / Marketing');
end;
$$;

comment on function public.seed_tenant_financeiro_padrao(uuid, text) is
  'Sprint 36 — cria plano de contas + categorias financeiras + centros de custo padrão por segmento. Idempotente: não roda se o tenant já tiver plano_contas.';

-- =============================================================================
-- 2) Chamar automaticamente na criação de toda empresa nova
-- =============================================================================
create or replace function public.create_tenant_with_owner(
  p_name text,
  p_slug text,
  p_segment text default null
)
returns table (out_tenant_id uuid, out_slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tenant_id uuid;
  v_slug text;
  v_name text;
  v_segment text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  v_name := trim(coalesce(p_name, ''));
  v_slug := lower(trim(coalesce(p_slug, '')));

  if v_name = '' or char_length(v_name) > 200 then
    raise exception 'invalid_tenant_name' using errcode = '22023';
  end if;

  if v_slug = '' or char_length(v_slug) > 80 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid_tenant_slug' using errcode = '22023';
  end if;

  v_segment := nullif(trim(coalesce(p_segment, '')), '');

  insert into public.tenants (name, slug, segment, segment_version, segment_config)
  values (
    v_name,
    v_slug,
    v_segment,
    1,
    '{}'::jsonb
  )
  returning id into v_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, role, status)
  values (v_tenant_id, v_uid, 'owner', 'active');

  -- Sprint 36: toda empresa nova já nasce com plano de contas / categorias /
  -- centros de custo padrão pro segmento dela — sem precisar de intervenção
  -- manual depois. Roda dentro da mesma transação (atômico com a criação).
  perform public.seed_tenant_financeiro_padrao(v_tenant_id, v_segment);

  out_tenant_id := v_tenant_id;
  out_slug := v_slug;
  return next;
end;
$$;

comment on function public.create_tenant_with_owner(text, text, text) is
  'Sprint 34.2 + 35.0 + 36 — cria tenant + owner + plano financeiro padrão por segmento. segment_version=1 em empresas novas.';

-- =============================================================================
-- 3) Backfill — empresas que já existem e ainda estão com o financeiro zerado
-- =============================================================================
do $$
declare
  r record;
begin
  for r in
    select t.id, t.segment
    from public.tenants t
    where not exists (
      select 1 from public.plano_contas pc where pc.tenant_id = t.id
    )
  loop
    perform public.seed_tenant_financeiro_padrao(r.id, r.segment);
  end loop;
end $$;
