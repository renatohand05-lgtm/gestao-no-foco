# Runbook — Billing do piloto (Sprint 33.3)

## Objetivo

Operar o primeiro cliente em **trial sem cartão**, com schema de assinatura por tenant, sem cobrança real automática.

## Pré-requisitos

1. Snapshot/backup: `docs/pilot/PRODUCTION_RECOVERY.md`
2. Migration **manual** no SQL Editor production:
   - Arquivo: `supabase/migrations/20260823_phase33_3_billing.sql`
   - **Não** usar `supabase db push` automático nesta sprint
3. Deploy web com código 33.3
4. `BILLING_ENFORCEMENT=0` no Vercel até homologar restrições

## Ativar trial no tenant piloto

1. Login como **OWNER** do tenant
2. Ir em **Configurações → Assinatura**
3. Clicar **Ativar trial piloto (sem cartão)**
4. Conferir `trial_end` (padrão 30 dias via `BILLING_PILOT_TRIAL_DAYS`)

## O que NÃO fazer

- Não cobrar cliente real sem autorização explícita do Renato
- Não setar `BILLING_ENFORCEMENT=1` em production sem homologação
- Não colocar secrets de pagamento no frontend
- Não compartilhar assinatura entre tenants
- Não apagar tenant/dados em `past_due`/`canceled`

## Quando houver provedor

1. Renato escolhe provedor (Stripe / Asaas / Mercado Pago)
2. Configura secrets **somente** no Vercel (Production)
3. Aponta webhook para `https://gestao-no-foco.vercel.app/api/billing/webhook`
4. Testa em **sandbox** primeiro
5. Só então autoriza checkout real (sprint futura)

## Recovery

Falha de billing **não** exige restore de dados de negócio.  
Se migration falhar: não reaplicar parcialmente; revisar SQL; rollback = não usar tabelas até correção.

## Contato de decisão

Credenciais/conta externa: **aguardando escolha do Renato** (ver `BILLING_ARCHITECTURE.md`).
