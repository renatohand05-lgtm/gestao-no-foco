-- Sprint 35.1 — especialidade de profissionais como texto livre.
-- Oficina continua sugerindo o enum na UI; barbearia usa presets (Corte, Barba, etc.).
-- Não cria tabela paralela.

alter table public.mecanicos
  drop constraint if exists mecanicos_especialidade_check;
