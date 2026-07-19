-- Sprint 13.15.2 — Hierarquia gerencial DRE (dre_detalhe)
-- Execute MANUALMENTE no Supabase SQL Editor
-- NÃO executar automaticamente em produção
-- Preserva dados existentes; não apaga classificações já confirmadas
--
-- Procedimento:
--   1) Supabase → SQL Editor
--   2) Colar este arquivo → Run
--   3) Em Categorias / Pendentes do DRE, aplicar sugestões com confirmação

-- =============================================================================
-- categorias_financeiras
-- =============================================================================
alter table public.categorias_financeiras
  add column if not exists dre_detalhe text;

alter table public.categorias_financeiras
  add column if not exists dre_classificacao_origem text;

alter table public.categorias_financeiras
  add column if not exists dre_classificacao_em timestamptz;

alter table public.categorias_financeiras
  drop constraint if exists categorias_financeiras_dre_detalhe_check;

alter table public.categorias_financeiras
  add constraint categorias_financeiras_dre_detalhe_check
  check (
    dre_detalhe is null
    or dre_detalhe in (
      'locacao_aluguel','locacao_condominio','locacao_iptu','locacao_seguro_imovel',
      'locacao_equipamentos','locacao_veiculos','locacao_outras',
      'utilidades_energia','utilidades_agua','utilidades_gas','utilidades_internet',
      'utilidades_telefonia','utilidades_gerador','utilidades_outras',
      'manutencao_predial','manutencao_equipamentos','manutencao_limpeza',
      'manutencao_seguranca','manutencao_pragas','manutencao_terceirizados',
      'manutencao_contabilidade','manutencao_juridico','manutencao_consultorias',
      'manutencao_outras',
      'admin_escritorio','admin_copa','admin_combustivel','admin_viagens',
      'admin_correios','admin_treinamentos','admin_uniformes','admin_outras',
      'tech_software','tech_licencas','tech_assinaturas','tech_erp',
      'tech_telefonia_digital','tech_hospedagem','tech_servicos',
      'seguros_operacionais','taxas_operacionais','opex_outras',
      'pessoal_salarios','pessoal_prolabore','pessoal_encargos','pessoal_ferias',
      'pessoal_13','pessoal_beneficios','pessoal_horas_extras','pessoal_bonus',
      'pessoal_outros',
      'comercial_marketing','comercial_anuncios','comercial_comissoes','comercial_outros',
      'cmv_mao_obra_direta','cmv_materiais','cmv_outros'
    )
  );

alter table public.categorias_financeiras
  drop constraint if exists categorias_financeiras_dre_origem_check;

alter table public.categorias_financeiras
  add constraint categorias_financeiras_dre_origem_check
  check (
    dre_classificacao_origem is null
    or dre_classificacao_origem in ('manual', 'sugestao_nome', 'lote')
  );

create index if not exists idx_categorias_dre_detalhe
  on public.categorias_financeiras (tenant_id, dre_detalhe)
  where deleted_at is null and dre_detalhe is not null;

comment on column public.categorias_financeiras.dre_detalhe is
  'Detalhe gerencial (ex.: utilidades_energia). Totais DRE usam dre_linha.';
comment on column public.categorias_financeiras.dre_classificacao_origem is
  'Origem da última classificação: manual | sugestao_nome | lote.';

-- =============================================================================
-- plano_contas
-- =============================================================================
alter table public.plano_contas
  add column if not exists dre_detalhe text;

alter table public.plano_contas
  add column if not exists dre_classificacao_origem text;

alter table public.plano_contas
  add column if not exists dre_classificacao_em timestamptz;

alter table public.plano_contas
  drop constraint if exists plano_contas_dre_detalhe_check;

alter table public.plano_contas
  add constraint plano_contas_dre_detalhe_check
  check (
    dre_detalhe is null
    or dre_detalhe in (
      'locacao_aluguel','locacao_condominio','locacao_iptu','locacao_seguro_imovel',
      'locacao_equipamentos','locacao_veiculos','locacao_outras',
      'utilidades_energia','utilidades_agua','utilidades_gas','utilidades_internet',
      'utilidades_telefonia','utilidades_gerador','utilidades_outras',
      'manutencao_predial','manutencao_equipamentos','manutencao_limpeza',
      'manutencao_seguranca','manutencao_pragas','manutencao_terceirizados',
      'manutencao_contabilidade','manutencao_juridico','manutencao_consultorias',
      'manutencao_outras',
      'admin_escritorio','admin_copa','admin_combustivel','admin_viagens',
      'admin_correios','admin_treinamentos','admin_uniformes','admin_outras',
      'tech_software','tech_licencas','tech_assinaturas','tech_erp',
      'tech_telefonia_digital','tech_hospedagem','tech_servicos',
      'seguros_operacionais','taxas_operacionais','opex_outras',
      'pessoal_salarios','pessoal_prolabore','pessoal_encargos','pessoal_ferias',
      'pessoal_13','pessoal_beneficios','pessoal_horas_extras','pessoal_bonus',
      'pessoal_outros',
      'comercial_marketing','comercial_anuncios','comercial_comissoes','comercial_outros',
      'cmv_mao_obra_direta','cmv_materiais','cmv_outros'
    )
  );

alter table public.plano_contas
  drop constraint if exists plano_contas_dre_origem_check;

alter table public.plano_contas
  add constraint plano_contas_dre_origem_check
  check (
    dre_classificacao_origem is null
    or dre_classificacao_origem in ('manual', 'sugestao_nome', 'lote')
  );

create index if not exists idx_plano_contas_dre_detalhe
  on public.plano_contas (tenant_id, dre_detalhe)
  where deleted_at is null and dre_detalhe is not null;

comment on column public.plano_contas.dre_detalhe is
  'Detalhe gerencial hierárquico. Não altera CAPEX; utilidades/locacao são opex.';
