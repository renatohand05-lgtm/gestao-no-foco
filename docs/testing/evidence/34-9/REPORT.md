# Sprint 34.9 — Contas a Pagar: Beneficiários + despesas rápidas

**Data:** 2026-08-14  
**Branch:** `main`  
**Tipo:** UX/modelo Contas a Pagar — sem billing / Asaas / 33.11 / auto-migration prod  
**34.8:** GO (beta controlado aguarda homologação desta melhoria)

## Status

**SPRINT 34.9: GO (código)** — migration production **PENDING** · homologação manual **PENDING**

### Revisão pós-homologação (forma contextual)

Lançamento rápido agora **sugere/prioriza** formas de pagamento do tenant conforme o tipo de despesa.
Sem migration nova. Reutiliza `formas_pagamento.tipo` + match de nome. DOC não é incentivado.

## Decisão arquitetural

| Opção | Decisão |
|---|---|
| Empurrar mecânicos/equipe em `fornecedores` | **Não** |
| Tabela única party polimórfica | **Não** (neste sprint) |
| `financeiro_beneficiarios` + tipagem em CAP | **Sim** |
| Preservar `fornecedor_id` + `fornecedor_nome` | **Sim** (legado) |
| Novos enums/colunas de forma de pagamento | **Não** — match em catálogo existente |

### Modelo

- **Fornecedor** → `fornecedor_id` (compras)
- **Mecânico** → `mecanico_id` + nome em `fornecedor_nome` (display)
- **Funcionário/vendedor** → `beneficiario_profile_id` + nome display
- **Prestador/locador/concessionária/governo/outro** → `financeiro_beneficiarios` + `beneficiario_id`
- **Nome livre** → `fornecedor_nome` (lançamento pontual)
- **`beneficiario_tipo`** tipifica o pagamento

Display em listagens continua usando `resolveFornecedorNome` (rótulo UI: **Beneficiário**).

### Presets

Templates em `lib/financeiro/despesa-presets.ts` — resolvem categoria/plano por match de nome/`dre_linha` no catálogo do tenant. **Não inventam IDs.** Se faltar: “Pendente de classificação”.

### Forma de pagamento contextual

`lib/financeiro/despesa-forma-pagamento.ts`:

| Grupo de despesa | Prioridade sugerida (se existir no tenant) |
|---|---|
| Salários / pró-labore / comissões | PIX → transferência → TED → depósito → dinheiro → débito em conta |
| Prestadores / aluguel | PIX → transferência → boleto → débito em conta → dinheiro |
| Energia / água / internet / telefone / condomínio | Boleto → PIX → débito automático → cartão |
| Contabilidade / royalties / marketing / software | PIX → transferência → boleto → cartão → débito automático |
| Combustível / material / manutenção / frete | PIX → cartão → boleto → transferência → dinheiro |
| Impostos / taxas | PIX → guia/código de barras → débito em conta → transferência |

- Apenas **sugestão**; usuário pode alterar.
- Seleção manual é preservada ao trocar preset (não sobrescreve).
- Sem acoplamento com DRE/categoria — `forma_pagamento_id` continua operacional.
- Listagem de CAP passa a carregar `tipo` só para ranquear opções.

### Recorrência

Já existe `despesas_recorrentes` — **não** geramos títulos futuros novos nesta sprint. UX de CAP aponta classificação; motor complexo fora de escopo.

### Folha / comissão

Sem cálculo de encargos ou comissão automática.

## Migration

`supabase/migrations/20260827_phase34_9_contas_pagar_beneficiarios.sql`

- Aditiva, idempotente, sem DELETE
- RLS finance helpers 33.1 quando existirem
- **PRODUCTION: NÃO EXECUTADA** — Renato aplica após revisão

**Forma contextual:** **NENHUMA** migration adicional.

Fallback de insert no service: se colunas 34.9 ausentes, grava legado (`fornecedor_*`) para não quebrar ambientes sem migration.

## Testes

`npm run test:phase34-9-contas-pagar-beneficiarios`

## Homologação manual (após migration)

1. Salário → mecânico ou equipe + conferir forma sugerida (PIX/transf se cadastradas)
2. Prestador (cadastro rápido) + forma sugerida
3. Aluguel → locador
4. Energia → concessionária + boleto/PIX priorizados
5. Água
6. Royalties
7. Marketing
8. Fornecedor tradicional
9. Troca de empresa (isolamento)
10. Mobile web
11. Alterar manualmente a forma sugerida e salvar

**Não** lançar despesas reais de cliente beta sem necessidade.

## Critérios

| Item | Status |
|---|---|
| BENEFICIÁRIO | **PASS** |
| FORNECEDOR | **PASS** |
| FUNCIONÁRIO/EQUIPE | **PASS** (lista se RLS permitir; senão nome livre) |
| MECÂNICO | **PASS** |
| PRESTADOR | **PASS** |
| BENEFICIÁRIO LIVRE | **PASS** |
| SALÁRIOS / ALUGUEL / ENERGIA / ÁGUA / ROYALTIES / MARKETING | **PASS** (presets + forma) |
| FORMA PAGAMENTO CONTEXTUAL | **PASS** (sugestão; sem migration) |
| DRE / PLANO / CATEGORIA | **PASS** (mapping existente + pendência honesta) |
| CENTRO / RATEIO | **PASS** (preservados) |
| TENANT / CROSS / RBAC | **PASS** (contratos) |
| LEGACY | **PASS** |
| MOBILE | **PARTIAL** (layout chips + selects + optgroups) |

## Billing

**FROZEN SAFE** · Cliente beta: **NO-GO** até homologar 34.9 · Cliente pago: **NO-GO**

## Próxima ação

Renato: (1) aplicar `20260827_phase34_9_contas_pagar_beneficiarios.sql` se ainda não aplicou; (2) smoke checklist incluindo forma sugerida por despesa e alteração manual.
