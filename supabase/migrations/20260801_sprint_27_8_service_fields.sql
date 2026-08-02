-- Sprint 27.8 — Campos específicos de serviço em public.produtos
-- IDEMPOTENTE: seguro reexecutar.
-- NÃO executar automaticamente nesta sprint — aplicar manualmente após revisão humana.
-- Colunas nullable; uso esperado quando tipo = 'servico'.

alter table public.produtos
  add column if not exists tempo_estimado_minutos integer null;

alter table public.produtos
  add column if not exists preco_sugerido numeric(14, 2) null;

alter table public.produtos
  add column if not exists especialidade text null;

alter table public.produtos
  add column if not exists equipe_ou_profissional text null;

alter table public.produtos
  add column if not exists unidade_cobranca text null;

comment on column public.produtos.tempo_estimado_minutos is
  'Sprint 27.8 — duração estimada do serviço em minutos';
comment on column public.produtos.preco_sugerido is
  'Sprint 27.8 — preço sugerido de mão de obra / serviço';
comment on column public.produtos.especialidade is
  'Sprint 27.8 — especialidade do serviço';
comment on column public.produtos.equipe_ou_profissional is
  'Sprint 27.8 — profissional ou equipe sugerida';
comment on column public.produtos.unidade_cobranca is
  'Sprint 27.8 — unidade de cobrança do serviço (UN, HORA, etc.)';

-- Constraints recriadas de forma idempotente
alter table public.produtos
  drop constraint if exists produtos_tempo_estimado_minutos_nonneg;

alter table public.produtos
  add constraint produtos_tempo_estimado_minutos_nonneg
  check (tempo_estimado_minutos is null or tempo_estimado_minutos >= 0);

alter table public.produtos
  drop constraint if exists produtos_preco_sugerido_nonneg;

alter table public.produtos
  add constraint produtos_preco_sugerido_nonneg
  check (preco_sugerido is null or preco_sugerido >= 0);
