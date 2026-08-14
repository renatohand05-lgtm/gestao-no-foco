# Sprint 34.9 — Contas a Pagar: Beneficiários + despesas rápidas

**Data:** 2026-08-14  
**Branch:** `main`  
**Tipo:** UX/modelo Contas a Pagar — sem billing / Asaas / 33.11 / auto-migration prod  

## Status

**SPRINT 34.9: GO (código)** — migrations production **PENDING** · homologação manual **PENDING**

### Correção final — categorias financeiras

**Problema:** select "Categoria financeira" em Nova conta mostrava poucas opções (~2).

#### CAUSA RAIZ

Fonte real: `nova/page.tsx` → `listCategorias()` → tabela `categorias_financeiras` (tenant), filtro `tipo in (despesa, ambos)` + `ativo`.

Não era bug de UI/enum hardcoded. Tenants de teste nasceram sem catálogo mínimo de despesa (onboarding não semeia categorias). Presets 34.9 só fazem match no que existe — com 2 categorias, a jornada fica incompleta.

#### Correção

1. `lib/financeiro/categorias-financeiras-catalog.ts` — catálogo mínimo + aliases anti-duplicata + DRE
2. `ensureContasPagarCategoriasCatalog()` em `listCategorias` (idempotente)
3. Migration `20260829_phase34_9_finance_categories_catalog.sql` — backfill tenants existentes
4. **Não** cria plano de contas automaticamente (fica pendente se não houver)

## Catálogo final (despesa)

Salários · Pró-labore · Comissões · Benefícios / encargos · Prestadores de serviço · Contabilidade · Aluguel · Condomínio · Energia elétrica · Água / saneamento · Internet · Telefonia · Marketing / publicidade · Royalties · Software / assinaturas · Combustível · Frete · Manutenção · Material de escritório · Material de consumo · Impostos / taxas · Seguros · Tarifas bancárias · Outras despesas

## Migrations 34.9 (aplicar em ordem)

1. `20260827_phase34_9_contas_pagar_beneficiarios.sql`
2. `20260828_phase34_9_formas_pagamento_catalog.sql`
3. `20260829_phase34_9_finance_categories_catalog.sql`

**PRODUCTION: NÃO EXECUTADAS automaticamente.**

## Homologação (após migrations + deploy)

1. Nova conta → Categoria financeira com lista ampla
2. Lançamento rápido Salários/Energia/Marketing pré-preenche categoria
3. Sem duplicar ENERGIA / ENERGIA ELÉTRICA
4. Troca de empresa (isolamento)
5. Formas de pagamento (correção anterior)

## Billing

**FROZEN SAFE** · Beta **NO-GO** até homologar 34.9 · Pago **NO-GO**

## Próxima ação

Renato: aplicar `20260829_phase34_9_finance_categories_catalog.sql` (e as anteriores 34.9 se faltarem); validar select de Categoria financeira em Nova conta.
