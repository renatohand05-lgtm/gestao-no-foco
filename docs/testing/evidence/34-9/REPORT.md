# Sprint 34.9 — Contas a Pagar: Beneficiários + despesas rápidas

**Data:** 2026-08-14  
**Branch:** `main`  
**Tipo:** UX/modelo Contas a Pagar — sem billing / Asaas / 33.11 / auto-migration prod  
**34.8:** GO (beta controlado aguarda homologação desta melhoria)

## Status

**SPRINT 34.9: GO (código)** — migration production **PENDING** · homologação manual **PENDING**

## Decisão arquitetural

| Opção | Decisão |
|---|---|
| Empurrar mecânicos/equipe em `fornecedores` | **Não** |
| Tabela única party polimórfica | **Não** (neste sprint) |
| `financeiro_beneficiarios` + tipagem em CAP | **Sim** |
| Preservar `fornecedor_id` + `fornecedor_nome` | **Sim** (legado) |

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

### Recorrência

Já existe `despesas_recorrentes` — **não** geramos títulos futuros novos nesta sprint. UX de CAP aponta classificação; motor complexo fora de escopo.

### Folha / comissão

Sem cálculo de encargos ou comissão automática.

## Migration

`supabase/migrations/20260827_phase34_9_contas_pagar_beneficiarios.sql`

- Aditiva, idempotente, sem DELETE
- RLS finance helpers 33.1 quando existirem
- **PRODUCTION: NÃO EXECUTADA** — Renato aplica após revisão

Fallback de insert no service: se colunas 34.9 ausentes, grava legado (`fornecedor_*`) para não quebrar ambientes sem migration.

## Testes

`npm run test:phase34-9-contas-pagar-beneficiarios`

## Homologação manual (após migration)

1. Salário → mecânico ou equipe  
2. Prestador (cadastro rápido)  
3. Aluguel → locador  
4. Energia → concessionária cadastrada  
5. Água  
6. Royalties  
7. Marketing  
8. Fornecedor tradicional  
9. Troca de empresa (isolamento)  
10. Mobile web  

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
| SALÁRIOS / ALUGUEL / ENERGIA / ÁGUA / ROYALTIES / MARKETING | **PASS** (presets) |
| DRE / PLANO / CATEGORIA | **PASS** (mapping existente + pendência honesta) |
| CENTRO / RATEIO | **PASS** (preservados) |
| TENANT / CROSS / RBAC | **PASS** (contratos) |
| LEGACY | **PASS** |
| MOBILE | **PARTIAL** (layout chips + selects) |

## Billing

**FROZEN SAFE** · Cliente beta: **NO-GO** até homologar 34.9 · Cliente pago: **NO-GO**

## Próxima ação

Renato: revisar e aplicar `20260827_phase34_9_contas_pagar_beneficiarios.sql` em production; smoke checklist 10 itens.
