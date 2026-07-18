-- Completa os campos de classificação e competência de contas a receber.
-- Mantém os vínculos financeiros anuláveis no banco para preservar registros
-- legados e os lançamentos gerados pelas RPCs existentes.

alter table public.contas_receber
  add column if not exists plano_conta_id uuid
    references public.plano_contas (id) on delete set null,
  add column if not exists data_competencia date;

update public.contas_receber
set data_competencia = data_emissao
where data_competencia is null;

alter table public.contas_receber
  alter column data_competencia set default current_date,
  alter column data_competencia set not null;

create index if not exists idx_contas_receber_plano_conta_id
  on public.contas_receber (plano_conta_id);

create index if not exists idx_contas_receber_data_competencia
  on public.contas_receber (data_competencia);

comment on column public.contas_receber.plano_conta_id is
  'Conta analítica usada na classificação do DRE';

comment on column public.contas_receber.data_competencia is
  'Data de competência contábil do lançamento';
