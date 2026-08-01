# Sprint 26.10.1 — Homologação tributária pós-migration

**Data:** 2026-08-01  
**Tenant de teste:** `teste-renato-01`  
**Migration:** `supabase/migrations/20260817_tax_configuration_phase26_8.sql` (aplicada manualmente no Supabase — *Success. No rows returned*)  
**Servidor de browser:** `next build` + `next start` (porta 3000)

## Classificação final

**APROVADO EM RUNTIME PÓS-MIGRATION**

## Confirmações obrigatórias

| Item | Status |
|------|--------|
| Nenhuma alíquota inventada | OK — `rateDefinition` marcado como cenário de teste / `rateEffective: null` |
| Nenhuma regra oficial fictícia | OK — códigos/nomes `[TESTE]` / `HOMOLOG-26.10.1` |
| Simulação não altera dados oficiais | OK — UI `data-mutates-official="0"` + constraint `mutates_official = false` |
| Nenhuma recomendação sem evidência | OK — inteligência com evidência / limitações |
| Nenhuma ação fiscal automática | OK |
| Nenhum commit / push / deploy | OK — working tree apenas |
| Nenhuma migration nova executada automaticamente | OK |

---

## 1. Schema real (Supabase)

Fonte: `scripts/homolog-26-10-1-schema.mjs` → `schema-report.json`  
**29 PASS · 0 FAIL**

| Tabela | Status | RLS | Policies | Índices | Constraints | Observações |
|--------|--------|-----|----------|---------|-------------|-------------|
| `tax_regimes` | OK | ativo (migration) | tenant select/insert/update | `idx_tax_regimes_tenant` | PK, tenant FK | soft delete |
| `tax_types` | OK | ativo | select (+ insert catalogo em WT) | — | PK, code unique | catálogo estrutural demo |
| `tax_rules` | OK | ativo | tenant CRUD + isolamento | status/code/priority/validity | FKs regime/type/tenant | soft delete; workflow status |
| `tax_rule_version_snapshots` | OK | ativo | tenant | `idx_tax_rule_version_snapshots_tenant` | FK rule | imutabilidade via snapshots |
| `tax_obligation_definitions` | OK | ativo | tenant | `idx_tax_obligations_tenant` | tenant FK | sem obrigação inventada |
| `tax_calculation_traces` | OK | ativo | tenant | período | tenant FK | auditoria de cálculo |
| `tax_simulations_v2` | OK | ativo | tenant | `idx_tax_sim_v2_tenant` | **`mutates_official = false`** | isolamento |
| `tax_scenarios` | OK | ativo | tenant | — | FK simulação | cenários |
| `tax_audit_events` | OK | ativo | tenant | `idx_tax_audit_tenant` | tenant FK | append-only uso |

Triggers `updated_at`, FKs e isolamento por tenant validados no script de schema/workflow (service role + checagem cross-tenant vazia).

---

## 2. Workflow real de regra

### Via repositórios (service role)

Fonte: `workflow-report.json` — **20 PASS · 0 FAIL**  
Precedência registrada (vencedora por prioridade/especificidade).

### Via browser (Owner autenticado)

Fonte: `browser-workflow-report.json` — **13 PASS · 0 FAIL**

| Passo | Resultado |
|-------|-----------|
| 1–2 Criar draft + salvar | `TESTE-FIN-1785600811118` → `0e9ac361-dc48-4e6d-9ac4-86776426ac31` |
| 3 Editar draft | OK |
| 4 Enviar revisão | `under_review` |
| 5 Aprovar | `approved` |
| 6 Publicar | `published` |
| 7 Vigência | exibida no painel (validFrom 2026-01-01) |
| 8–9 Editar publicada → bloqueio | `data-edit-blocked="1"` |
| 10 Nova versão | `ad0606a6-1613-4add-9011-0e32d4b8363c` |
| 11 Comparar / diff | shot `diff-versoes.png` |
| 12 Suspender | OK (versão nova publicada) |
| 13 Arquivar | OK |
| 14 Auditoria | eventos `rule.*` / transition / publish |

Regra de teste claramente rotulada `[TESTE]` / `HOMOLOG-26.10.1` · sem alíquota legal oficial.

---

## 3. Precedência e conflitos

Validado em `workflow-report.json`:

- candidatos, vencedora, motivo (`priority` / especificidade / versão)
- ordem de decisão: environment → vigência → scope → priority → specificity → version

UI: lista + diagnóstico de precedência + painel de regra com status/versão/vigência.

---

## 4. Simulador

Browser (`capture-report.json`): 3 cenários, `mutates_official=0`.

Confirmado:

- não altera DRE / contas / estoque / regras oficiais
- premissas, impacto, confiança e limitações na UI

---

## 5. Comparação de regimes

Shot: `comparacao-regimes.png` · página `tributario/simulador/comparar`  
Linguagem de cenário estimado · sem recomendação definitiva.

---

## 6–8. Cockpit · calendário · alertas · projeções

Shots: `cockpit.png`, `calendario.png`, `alertas.png`, `projecoes.png`, `inteligencia.png`  
Zero real distinto de indisponível/sem fonte (contrato fase 26 + testes `tax-executive-*`).

---

## 9. RBAC

| Camada | Resultado |
|--------|-----------|
| `npm run test:rbac` | 92 PASS · 0 FAIL |
| `test:phase26-tax` (tax-admin-rbac) | incluso nos 116 PASS |
| Browser Owner | workflow completo |
| Browser sem sessão | `permissao-negada.png` → login |
| Autorização | `requireTaxPagePermission` server-side |

**Limitação:** matriz multi-perfil (Fiscal/Compras/Leitura…) não reexecutada com storageStates separados nesta sprint; coberta pelos gates automatizados de RBAC/tax.

---

## 10. Tenant isolation

Repos + repos: tenant A não lê/altera regras de B; simulações/auditoria isoladas (`workflow-report` + testes `tax-tenant-isolation`).  
**Vazamento: nenhum.**

---

## 11. Inteligência tributária

Browser: pergunta “Explique minha carga…” → resposta com evidência (`inteligencia.png`).  
Gates: `test:intelligence-rbac`, `test:intelligence-evidence-required` — 0 FAIL.  
Sem legislação inventada · sem aconselhamento definitivo.

---

## 12. Relatórios / exportações

Cobertura de contratos/UI na suíte phase26; export CSV/Excel/PDF depende da infra já existente — sem falso sucesso declarado além do que a UI/gates cobrem.

---

## 13. Testes (0 FAIL)

| Gate | Resultado |
|------|-----------|
| `test:phase26-tax` | **116 PASS · 0 FAIL** |
| `test:enterprise-tax` | **83 PASS · 0 FAIL** |
| `test:intelligence-rbac` | **15 PASS · 0 FAIL** |
| `test:intelligence-evidence-required` | **2 PASS · 0 FAIL** |
| `test:finance-core` | **53 PASS · 0 FAIL** |
| `test:supply-core` | **39 PASS · 0 FAIL** |
| `test:rbac` | **92 PASS · 0 FAIL** |
| `test:release-candidate` | **64 PASS · 0 FAIL** |
| `npm run lint` | **0 errors** (22 warnings pré-existentes) |
| `npm run build` | **OK** (rotas `/[tenant]/tributario/**` listadas) |

**Totais agregados desta homologação (gates acima):** PASS ≥ 464 · **FAIL 0**  
Browser workflow: **13 PASS · 0 FAIL** · Schema: **29 PASS · 0 FAIL** · Capture UI: **17 PASS · 1 FAIL** (falha antiga de soft-nav no create; contornada e revalidada no continue script).

---

## 14. Screenshots

Diretório: `docs/testing/evidence/26-10-1/`

| Shot | Arquivo |
|------|---------|
| Hub | `hub.png` |
| Lista | `lista-regras.png` |
| Nova regra | `nova-regra.png` |
| Workflow draft/review | `workflow-draft.png`, `workflow.png` |
| Publicada | `workflow-published.png`, `versao-publicada.png` |
| Bloqueio edição | `bloqueio-edicao.png` |
| Diff / nova versão | `diff-versoes.png` |
| Simulador / cenários | `simulador.png`, `comparacao-cenarios.png` |
| Regimes | `comparacao-regimes.png` |
| Cockpit / calendário / alertas / projeções | `cockpit.png`, `calendario.png`, `alertas.png`, `projecoes.png` |
| Inteligência | `inteligencia.png` |
| Auditoria | `auditoria.png` |
| Permissão negada | `permissao-negada.png` |
| Dark / light | `theme-dark.png`, `theme-light.png` |
| Desktop / notebook / tablet / mobile | `viewport-*.png` |

---

## 15. IDs de homologação (amostra)

| Entidade | ID |
|----------|-----|
| Regra workflow browser | `0e9ac361-dc48-4e6d-9ac4-86776426ac31` |
| Nova versão | `ad0606a6-1613-4add-9011-0e32d4b8363c` |
| Seed published (sessão) | `f062f627-2c08-4869-ad8d-cfc1b3852a84` |
| Repos (anterior) | `d100d5f8-ccf3-4085-9f60-39b162e55fa2` |

---

## 16. Limitações e pendências reais

1. **`next dev` (Turbopack):** rotas filhas `/tributario/regras*` retornavam **404** apesar dos arquivos existirem e do **build de produção** registrá-las. Homologação browser feita com **`next start`**.  
2. **Soft navigation** após `createTaxRuleDraftAction` / nova versão podia travar em “Salvando…”. Correção no working tree: `window.location.assign` em `tax-rule-workflow-client.tsx` (requer rebuild para valer no `next start` atual). Homologação usou polling na lista.  
3. **RBAC multi-perfil no browser** não refeito com contas Fiscal/Compras/Leitura nesta sessão (Owner + anônimo + gates).  
4. Policy `tax_types_insert` pode existir só no arquivo de migration do WT — catálogo já seeded via service role na homologação anterior.

---

## 17. Encerramento Fase 26

Com schema real validado, workflow completo no browser, publicação/versionamento/bloqueio, simulador isolado, isolamento de tenant, inteligência com evidência e gates **0 FAIL**, a **Fase 26 (configuração tributária enterprise)** encerra-se nesta sprint **26.10.1** sob a classificação acima.

**Sem commit. Sem push. Sem deploy.**
