# Runbook — Billing do piloto (Sprint 33.3)

## Status (pós-migration)

| Item | Estado |
|------|--------|
| Migration `20260823_phase33_3_billing.sql` | **Aplicada** em production (Renato · SQL Editor Success) |
| Smoke pós-migration | **36 PASS** (`npm run test:phase33-3-post-migration-smoke`) |
| Provedor de pagamento | **Não configurado** |
| Cobrança real | **Desligada** |

**Não reaplicar** a migration salvo instrução explícita de correção.

## Objetivo

Operar o primeiro cliente em **trial sem cartão**, com assinatura por tenant.

## Ativar trial no tenant piloto (OWNER)

1. Login como **OWNER** em tenant de teste ou piloto
2. **Configurações → Assinatura**
3. **Ativar trial piloto (sem cartão)**
4. Conferir `trial_end` (padrão 30 dias · `BILLING_PILOT_TRIAL_DAYS`)
5. Manter `BILLING_ENFORCEMENT=0` no Vercel

## O que NÃO fazer

- Não reexecutar a migration sem necessidade
- Não cobrar cliente real sem autorização explícita
- Não configurar Stripe/Asaas/MP nesta etapa de homologação
- Não colocar secrets no frontend
- Não compartilhar assinatura entre tenants
- Não apagar tenant/dados em `past_due`/`canceled`

## Próximo passo comercial (depois da 33.4 / autorização)

1. Escolher provedor (**recomendação técnica: Asaas**)
2. Criar conta **sandbox**
3. Configurar secrets só no Vercel
4. Webhook → `https://gestao-no-foco.vercel.app/api/billing/webhook`
5. Homologar sandbox → só então cobrança real

## Recovery

Falha de billing **não** exige restore de dados de negócio.  
Snapshot geral: `docs/pilot/PRODUCTION_RECOVERY.md`.
