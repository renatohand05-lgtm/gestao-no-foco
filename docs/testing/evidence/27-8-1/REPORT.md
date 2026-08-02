# Sprint 27.8.1 — Homologação pós-migration

**Data:** 2026-08-01 / 2026-08-02 (UTC)  
**Tenant:** `teste-renato-01`  
**Migration aplicada (manual, operador):** `supabase/migrations/20260801_sprint_27_8_service_fields.sql`  
**SQL Editor:** Success. No rows returned  
**Classificação:** **APROVADO EM RUNTIME PÓS-MIGRATION**

Sem commit · sem push · sem deploy · sem SQL automático nesta etapa.

---

## Veredito

Schema real confirma as 5 colunas + constraints. Cadastro UI e API persistem os novos campos. Soft-delete dos serviços de teste executado. Selects críticos (GFSelect) sem painel branco no dark. DRE comparativo renderiza com exportações. Gates **0 FAIL**.

---

## 1. Schema validado

| Campo | Leitura | Create | Update | Null | Constraint |
|---|---|---|---|---|---|
| `tempo_estimado_minutos` | OK | OK | OK | OK | bloqueia negativo |
| `preco_sugerido` | OK | OK | OK | OK | bloqueia negativo |
| `especialidade` | OK | OK | OK | OK | — |
| `equipe_ou_profissional` | OK | OK | OK | OK | — |
| `unidade_cobranca` | OK | OK | OK | OK | — |

Evidência: `schema-crud-report.json` — **41 PASS · 0 FAIL**

Também validado:

- filtro por código / busca por nome
- isolamento por `tenant_id`
- RLS: anon sem membership não lista `produtos`
- soft-delete preserva registro (sem hard-delete)
- contagem de **produtos** estável antes/depois

---

## 2. Cadastro de serviço

- Form `/produtos/novo?tipo=servico` exibe campos novos
- UI: criar → redirecionar → persistir (**PASS** na 2ª captura)
- API service-role: create/edit/reopen/nulls/constraints (**PASS**)
- Serviços de teste identificados com `[TESTE 27.8.1…]`
- Soft-delete pós-homolog: **2** serviços UI — `cleanup-test-services.json`

---

## 3. Importação

Planilha controlada (validação pura + suite):

| Caso | Resultado |
|---|---|
| serviço válido | OK |
| custo zero | warning |
| preço zero | warning |
| preço < custo | warning |
| código duplicado na planilha | error |
| código existente | warning (update) |
| linha incompleta | error |

Suite `test:service-import`: persiste preço sugerido e tempo — **0 FAIL**.  
Nenhum produto afetado (contagem estável no schema-crud).

---

## 4. Limpeza da base

- UI `/produtos/gerenciar-servicos` com confirmação/ações
- Soft-delete / arquivar — sem hard-delete de histórico
- Suite `test:service-delete-safety` → **0 FAIL**
- Produtos e OS/vendas históricas não alterados nesta homologação

---

## 5. Produto × serviço

| Check | Status |
|---|---|
| Hub abas Produtos / Serviços | PASS (shots) |
| Form bifurcado serviço | PASS |
| `test:product-service-separation` | 13 PASS · 0 FAIL |
| Serviço sem estoque / com MO | coberto no form + testes |
| Badges / labels PRODUTO· SERVIÇO· | coberto nos testes de venda |

---

## 6. Selects

### Críticos (GFSelect)

Venda rápida (forma/conta/desconto/cliente), venda formal, filtros produtos/vendas, DRE, OS faturamento/canal.

Dark aberto: painel **escuro** (não branco) — `select-pagamento-dark-aberto.png`.  
Light: `select-pagamento-light-aberto.png`.

### Inventário restante

Arquivo: `SELECTS_REMAINING.md` · `selects-inventory.json`

| Tipo | Qtd |
|---|---:|
| GFSelect | 24 |
| GFCombobox | 0 |
| NativeSelect | 28 |
| select nativo (bare) | **161** |
| **Total ocorrências** | **213** |

**Não migrados nesta sprint** (conforme escopo). Próxima ação: NativeSelect ou GFSelect por criticidade.

### Limitação menor

Em alguns estados o trigger GFSelect pode mostrar UUID em vez do label (valor resolvido antes das options). Painel permanece themed.

Browsers automatizados: Chromium Playwright. Edge/Chrome manuais não repetidos nesta sessão.

---

## 7–8. DRE comparativo + responsividade

- URL: `financeiro/dre?comparativo=1&ano=2026&mesA=6&mesB=7`
- UI: Ano / Mês A / Mês B, CSV / Excel / Imprimir
- Semântica (testes): receita↑ melhora · despesa↑ piora · null ≠ zero
- Cálculo: duas chamadas `getDre` — engine canônica intacta
- Viewports: desktop 1440 · notebook 1280 · tablet 834 · mobile 390

Shots: `dre-comparativo-*.png`, `dre-drilldown.png`, `dre-export-area.png`

---

## 9. Screenshots

Pasta: `docs/testing/evidence/27-8-1/`

| Shot | Conteúdo |
|---|---|
| `select-pagamento-dark-aberto` | GFSelect aberto dark |
| `select-pagamento-light-aberto` | GFSelect aberto light |
| `hub-produtos-aba` / `hub-servicos-aba` | Abas |
| `cadastro-servico*` | Form + salvo |
| `importacao*` | Import |
| `inconsistencias-qualidade` | Qualidade |
| `limpeza*` | Gerenciar / confirmação |
| `os-adicionar-produto-servico` | OS |
| `dre-comparativo-*` | Desktop/notebook/tablet/mobile |
| `dre-drilldown` / `dre-export-area` | Drill / export |

Capture: **20 PASS · 0 FAIL · 19 shots** (`capture-report.json`)

---

## 10. Testes / gates

| Suite | Resultado |
|---|---|
| `test:sprint-27-8` | 57 PASS · 0 FAIL |
| `test:gf-select` | 9 PASS · 0 FAIL |
| `test:select-theme-contract` | 9 PASS · 0 FAIL |
| `test:product-service-separation` | 13 PASS · 0 FAIL |
| `test:service-import` | 15 PASS · 0 FAIL |
| `test:service-delete-safety` | 15 PASS · 0 FAIL* |
| `test:service-quality` | 15 PASS · 0 FAIL* |
| `test:dre-comparison` | 20 PASS · 0 FAIL |
| `test:dre-variance-semantics` | 20 PASS · 0 FAIL |
| `test:dre-drilldown` | 20 PASS · 0 FAIL |
| `test:dre-export` | 20 PASS · 0 FAIL |
| `lint` | 0 errors (23 warnings pré-existentes) |
| `build` (`GNF_DIST_DIR=.next-build`) | OK |
| `test:rbac` | 92 PASS · 0 FAIL |
| `test:finance-core` | 53 PASS · 0 FAIL |
| `test:supply-core` | 39 PASS · 0 FAIL |
| `test:inventory-core` | 15 PASS · 0 FAIL |
| `test:release-candidate` | 64 PASS · 0 FAIL |

\* Scripts `service-delete-safety` / `service-quality` compartilham runner de bulk/import no `sprint-27-8-tests.mjs` — ambos 0 FAIL.

Schema/CRUD runtime: **41 PASS · 0 FAIL**

---

## 11. Classificação

**APROVADO EM RUNTIME PÓS-MIGRATION**

Critérios atendidos: campos persistem · import/limpeza seguros · produto×serviço · selects críticos sem painel branco · DRE canônico · screenshots · gates 0 FAIL.

---

## 12. Confirmações finais

- Nenhum produto apagado
- Nenhum histórico hard-deleted
- Nenhum cálculo financeiro alterado nesta sprint
- Nenhuma identidade visual alterada
- Nenhum SQL executado automaticamente pelo agent (migration já aplicada pelo operador)
- Nenhum commit / push / deploy

### Pendências reais (não bloqueantes)

1. Migrar gradualmente os **161** selects nativos restantes (`SELECTS_REMAINING.md`)
2. Ajuste fino de label no GFSelect quando value=UUID (display)
3. Homologação visual Edge/manual mobile física opcional
4. Scroll full-page da tabela DRE em evidência adicional (header/filtros/export já capturados)

### Scripts de evidência

- `scripts/homolog-27-8-1-schema-crud.mjs`
- `scripts/capture-27-8-1-homolog.mjs`
- `scripts/inventory-27-8-1-selects.mjs`
- `scripts/homolog-27-8-1-cleanup-test-services.mjs`
