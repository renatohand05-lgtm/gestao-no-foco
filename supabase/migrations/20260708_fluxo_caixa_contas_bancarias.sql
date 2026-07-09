-- Migration: Fluxo de Caixa — evolução de Contas Bancárias
-- Execute manualmente no Supabase SQL Editor
-- Requer: contas_bancarias (Sprint 8.1)

alter table public.contas_bancarias
  add column if not exists saldo_atual numeric(15, 2) not null default 0;

comment on column public.contas_bancarias.saldo_atual is
  'Saldo operacional atualizado pelas movimentações bancárias (fluxo de caixa)';

-- Inicializa saldo_atual com saldo_inicial para registros existentes
update public.contas_bancarias
set saldo_atual = saldo_inicial
where saldo_atual = 0 and saldo_inicial <> 0;

create index if not exists idx_contas_bancarias_saldo_atual
  on public.contas_bancarias (saldo_atual);

-- Preparação: vínculo de conta bancária na baixa de contas a receber
alter table public.contas_receber
  add column if not exists conta_bancaria_id uuid
    references public.contas_bancarias (id) on delete set null;

create index if not exists idx_contas_receber_conta_bancaria_id
  on public.contas_receber (conta_bancaria_id);

comment on column public.contas_receber.conta_bancaria_id is
  'Conta utilizada na baixa — preparação para fluxo de caixa (Sprint 8.4)';
