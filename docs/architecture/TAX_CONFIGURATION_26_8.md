# Tax Configuration — Sprint 26.8

## Objetivo

Administração tributária Enterprise com versionamento, workflow, vigência, fontes e auditoria — sem hardcode de alíquotas no frontend e sem afetar cálculo oficial com drafts.

## MIGRATION NECESSÁRIA: SIM

Arquivo:

`supabase/migrations/20260817_tax_configuration_phase26_8.sql`

**MIGRATION PENDENTE DE APLICAÇÃO MANUAL.**

Não executada automaticamente. Não altera `20260811_enterprise_tax_intelligence.sql`.

### Tabelas novas

| Tabela | Função |
|---|---|
| `tax_regimes` | Regimes por tenant |
| `tax_types` | Catálogo estrutural (níveis) |
| `tax_rules` | Regras versionáveis + workflow |
| `tax_rule_version_snapshots` | Snapshots imutáveis (nome distinto da 26.7) |
| `tax_obligation_definitions` | Obrigações com fonte |
| `tax_calculation_traces` | Trilha de cálculo |
| `tax_simulations_v2` / `tax_scenarios` | Simulações isoladas (`mutates_official=false`) |
| `tax_audit_events` | Auditoria |

RLS via `tenant_members`. Triggers `updated_at`.

## Ambientes

- `configuracao`
- `simulacao`
- `producao`

Somente `published` + `producao` afeta cálculo oficial.

## Workflow

`draft → under_review → approved → published → superseded|suspended|archived`

Publicação exige fonte, vigência, aprovador e permissão.

## Código

- `lib/tax/*` — contratos, workflow, precedência, validade, conflitos, simulação, executivo, cache
- `app/(app)/[tenant]/tributario/*` — hub e subrotas
- `components/gf/gf-tax-*.tsx` — componentes GF
- Permissões `tax.*` (+ compat `financeiro.tributos.*`)

## Fundações reutilizadas (26.7)

Motor paramétrico em `lib/finance/tax-intelligence/` permanece para providers; dashboard legado em `financeiro/tributos`.

## Classificação sem migration aplicada

**PRONTO PARA APLICAÇÃO DA MIGRATION**
