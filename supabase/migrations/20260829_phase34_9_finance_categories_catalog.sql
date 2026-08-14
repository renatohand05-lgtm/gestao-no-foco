-- Sprint 34.9 — Catálogo mínimo de categorias financeiras (despesa) para CAP
-- Aditiva / idempotente / tenant-safe / sem DELETE / sem UPDATE destrutivo.
-- Não define plano_conta_id. Não sobrescreve customizações.
-- NÃO executar automaticamente em production — Renato aplica após revisão.

create or replace function public._gof_norm_categoria_nome(p text)
returns text
language sql
immutable
as $$
  select trim(both ' ' from regexp_replace(
    lower(
      translate(
        coalesce(p, ''),
        'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
        'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
      )
    ),
    '[^a-z0-9[:space:]]',
    ' ',
    'g'
  ));
$$;

create or replace function public._gof_categoria_despesa_exists(
  p_tenant_id uuid,
  p_aliases text[]
)
returns boolean
language plpgsql
stable
as $$
declare
  v_alias text;
  v_norm text;
begin
  foreach v_alias in array p_aliases
  loop
    v_norm := public._gof_norm_categoria_nome(v_alias);
    if exists (
      select 1
      from public.categorias_financeiras cf
      where cf.tenant_id = p_tenant_id
        and cf.deleted_at is null
        and cf.tipo in ('despesa', 'ambos')
        and (
          public._gof_norm_categoria_nome(cf.nome) = v_norm
          or (
            length(v_norm) >= 4
            and public._gof_norm_categoria_nome(cf.nome) like '%' || v_norm || '%'
          )
        )
    ) then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

do $$
declare
  r record;
begin
  for r in select t.id as tenant_id from public.tenants t
  loop
    if not public._gof_categoria_despesa_exists(r.tenant_id, array['salarios','salario','folha','folha salarial']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Salários', 'despesa', 'despesas_pessoal', 'pessoal_salarios', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['pro-labore','pro labore','prolabore']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Pró-labore', 'despesa', 'despesas_pessoal', 'pessoal_prolabore', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['comissoes','comissao','comissoes comerciais']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Comissões', 'despesa', 'despesas_comerciais', 'comercial_comissoes', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['beneficios / encargos','beneficios','encargos']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Benefícios / encargos', 'despesa', 'despesas_pessoal', 'pessoal_beneficios', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['prestadores de servico','prestadores','servicos de terceiros','servico de terceiros','terceirizados']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Prestadores de serviço', 'despesa', 'despesas_operacionais', 'manutencao_terceirizados', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['contabilidade','contador']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Contabilidade', 'despesa', 'despesas_operacionais', 'manutencao_contabilidade', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['aluguel','locacao']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Aluguel', 'despesa', 'despesas_operacionais', 'locacao_aluguel', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['condominio']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Condomínio', 'despesa', 'despesas_operacionais', 'locacao_condominio', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['energia eletrica','energia','luz','eletricidade']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Energia elétrica', 'despesa', 'despesas_operacionais', 'utilidades_energia', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['agua / saneamento','agua e saneamento','agua','saneamento']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Água / saneamento', 'despesa', 'despesas_operacionais', 'utilidades_agua', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['internet','banda larga']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Internet', 'despesa', 'despesas_operacionais', 'utilidades_internet', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['telefonia','telefone','celular']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Telefonia', 'despesa', 'despesas_operacionais', 'utilidades_telefonia', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['marketing / publicidade','marketing','publicidade','propaganda']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Marketing / publicidade', 'despesa', 'despesas_comerciais', 'comercial_marketing', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['royalties','royalty']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Royalties', 'despesa', 'despesas_operacionais', 'opex_outras', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['software / assinaturas','software','assinaturas','saas']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Software / assinaturas', 'despesa', 'despesas_operacionais', 'tech_assinaturas', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['combustivel','gasolina','diesel']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Combustível', 'despesa', 'despesas_operacionais', 'admin_combustivel', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['frete','fretes']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Frete', 'despesa', 'despesas_operacionais', 'admin_outras', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['manutencao','reparo']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Manutenção', 'despesa', 'despesas_operacionais', 'manutencao_outras', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['material de escritorio','material escritorio']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Material de escritório', 'despesa', 'despesas_operacionais', 'admin_escritorio', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['material de consumo','material consumo']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Material de consumo', 'despesa', 'despesas_operacionais', 'admin_outras', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['impostos / taxas','impostos','taxas','tributos']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Impostos / taxas', 'despesa', 'despesas_operacionais', 'taxas_operacionais', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['seguros','seguro']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Seguros', 'despesa', 'despesas_operacionais', 'seguros_operacionais', 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['tarifas bancarias','tarifa bancaria','tarifas']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Tarifas bancárias', 'despesa', 'despesas_financeiras', null, 'sugestao_nome', true);
    end if;

    if not public._gof_categoria_despesa_exists(r.tenant_id, array['outras despesas','outras','despesas diversas']) then
      insert into public.categorias_financeiras (tenant_id, nome, tipo, dre_linha, dre_detalhe, dre_classificacao_origem, ativo)
      values (r.tenant_id, 'Outras despesas', 'despesa', 'despesas_operacionais', 'opex_outras', 'sugestao_nome', true);
    end if;
  end loop;
end $$;

comment on function public._gof_norm_categoria_nome(text) is
  'Sprint 34.9 — normaliza nome de categoria financeira para match idempotente';
comment on function public._gof_categoria_despesa_exists(uuid, text[]) is
  'Sprint 34.9 — verifica se tenant já possui categoria de despesa equivalente';
