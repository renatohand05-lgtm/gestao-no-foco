-- =============================================================================
-- DEPRECATED — NÃO EXECUTAR ESTE ARQUIVO
-- =============================================================================
-- Sprint 13.19 original falhou com:
--   ERROR 42P01: relation "public.veiculos" does not exist
--
-- Causa: este script ASSUMIA que 20260713_create_ordens_retornos.sql já
-- tinha sido aplicada. Em ambientes onde a base OS não existia, o ALTER
-- em public.veiculos quebrou na primeira linha útil.
--
-- Use em vez disso (nessa ordem):
--   1) 20260723_diag_oficina_os_enterprise.sql   (somente leitura)
--   2) 20260723_fix_oficina_os_enterprise.sql    (reparo idempotente)
--
-- Este arquivo permanece no repositório apenas como histórico.
-- =============================================================================

do $$
begin
  raise exception
    'DEPRECATED: não execute 20260723_oficina_os_enterprise.sql. Use 20260723_fix_oficina_os_enterprise.sql (após o diagnóstico). Causa original: public.veiculos ausente quando a base 20260713 não estava aplicada.';
end $$;
