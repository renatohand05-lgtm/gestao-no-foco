# Catálogo comercial — Sprint 33.7

**Cobrança real: NO-GO.** `ASAAS_ENV=sandbox`. `BILLING_REAL_CHARGES_ENABLED` OFF.

## Preços aprovados (mensal, BRL)

| Plano | Slug | amount_cents | Preço |
|-------|------|--------------|-------|
| Essencial | `essential` | 27990 | R$ 279,90/mês |
| Gestão | `management` | 47990 | R$ 479,90/mês |
| Pro | `pro` | 74990 | R$ 749,90/mês |
| Pro Plus + Consultoria | `pro_plus_consulting` | 349990 | R$ 3.499,90/mês |

**Plano recomendado (UI apenas):** Gestão — R$ 479,90/mês.

**R$ 19,90 = HOMOLOGAÇÃO SANDBOX do plano `pilot`. NÃO É PREÇO COMERCIAL.**

## Trial

- Essencial / Gestão / Pro: 14 dias (não inicia automaticamente em tenants existentes)
- Pro Plus + Consultoria: sem trial automático; `requiresSalesContact`

## Entitlements

Arquitetura: tenant → subscription → plan → `entitlements` (server-side).  
RBAC ≠ entitlement. Enforcement comercial **desligado**.

Módulos CORE iguais nos quatro planos até decisão comercial.  
Nenhuma funcionalidade do piloto foi retirada para fabricar diferença.

Pro Plus: `includesConsulting=true` — consultoria humana **não** é automatizada.

Matriz técnica (`lib/billing/capability-matrix.ts`):

- CORE: operações, dashboard, clientes, produtos, estoque, compras, vendas, OS, agenda, equipe operacional, financeiro
- possível entitlement: CRM, inteligência, tributário, analytics, relatórios, integrações, automações
- administrativa: equipe/papéis, configurações
- segurança: RBAC, RLS
- billing: assinatura/checkout
- consultoria/serviço humano: consultoria Pro Plus (não automatizada)
- não aplicável a plano: mobile

## Upgrade / downgrade

Grafo técnico preparado. **Não cobra.** Downgrade não apaga dados.  
Preferência técnica de downgrade: próximo ciclo.

Política financeira (pró-rata, imediato vs ciclo): **PENDENTE DE DECISÃO COMERCIAL**.

## Decisões comerciais pendentes

- Funcionalidades exatas por plano
- Limites (seats, filiais, volume)
- Política de upgrade e pró-rata
- Política de downgrade (além da preferência next_cycle)
- Trial/entrada Pro Plus
- Condições comerciais
- Anualidade / desconto anual

## Seed

`supabase/migrations/20260824_phase33_7_commercial_catalog.sql` — upsert idempotente.  
Aplicar manualmente no SQL Editor quando Renato decidir. Não apaga `pilot`.
