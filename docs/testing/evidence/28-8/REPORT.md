# Sprint 28.8 — Enterprise Stabilization · Relatório final

**Data:** 2026-08-02  
**Tenant:** `teste-renato-01`  
**HEAD baseline:** `d577ddd` (`main`)  
**Restrições respeitadas:** sem git add/commit/push/deploy; sem SQL remoto; sem migrations executadas; working tree preservado.

## Classificação final

**APROVADO COM RESSALVAS**

Não **PRODUCTION READY**: CRUD fino de orçamento e agenda enterprise incompletos; conversões opp→orçamento / orçamento→venda|OS ainda `aguardando_integracao`; `supabase gen types` oficial não regenerado (sem token/Docker).

Não **REPROVADO**: 0 FAIL nas suítes executadas; build OK; homolog auth 47 PASS / 0 FAIL; 0 UUIDs na amostra; correções reais aplicadas sem inventar features.

---

## Baseline

Ver `docs/testing/evidence/28-8/BASELINE.md`.

| Item | Valor |
|------|-------|
| Branch | `main` |
| Commit | `d577ddd` |
| Tracked modificados (baseline) | 21 |
| Untracked Fase 28 | rotas/libs/migrations/evidence/scripts |

---

## Arquivos revisados / alterados nesta sprint (principais)

| Área | Arquivos |
|------|----------|
| Conversão lead | `lib/crm/actions.ts` (`convertLeadToClienteAction`), `components/crm/convert-lead-button.tsx`, `crm/leads/page.tsx` |
| Compras UX/RBAC | `compras/executivo/page.tsx` — acesso negado sem throw |
| Agenda / orçamento copy | `agenda/page.tsx`, `financeiro/orcamento/page.tsx` — messaging honesto |
| Funil labels | `clientes/funil`, nav CRM (pré-existente + clarificação) |
| Lint | `eslint.config.mjs` — ignora `.next-build-*` |
| Types audit | `docs/architecture/PHASE_28_TYPES_AUDIT.md` |
| Homolog | `scripts/homolog-28-8-browser.mjs` |
| Testes | `scripts/phase28-tests.mjs` (asserts conversão) |

---

## Bugs encontrados → corrigidos

| Bug | Correção |
|-----|----------|
| Fallback agenda com colunas erradas (`data_inicio`/`data_fim`) | Já alinhado a `inicio`/`fim` |
| Hub Compras/`executivo` lançava erro de permissão (console + error boundary) | UI **Acesso negado** explícita |
| Rotas homolog erradas `/servicos`, `/metas` (404) | Canônicas: `produtos/servicos`, `analytics/metas`, `configuracoes/metas` |
| Lead→cliente só como plano sem action | `convertLeadToClienteAction` + botão (idempotente: mesma linha `clientes`, stage `contato`) |
| Copy orçamento prometia CRUD “Sprint 28.7” | Mensagem de listagem / dívida explícita |
| ESLint varrendo artefatos `.next-build-*` | Ignore no config |

---

## Duplicidades e fontes canônicas

| Domínio | Canônico | Paralelo (não apagado) |
|---------|----------|----------------------|
| CRM pessoa | `clientes.estagio_funil` + `/clientes/funil` | Inbox `/crm/leads` (filtro lead) |
| CRM deals | `crm_oportunidades` + stages | — |
| Agenda operacional | `agenda_eventos` + `/agenda` | `cliente_agendamentos` (ficha cliente) |
| Orçamento financeiro | `finance_budgets*` (list/variance) | Orçamento de venda (módulo Vendas) |
| Finance engines | Flujo / caixa / DRE canônicos | Sem alteração de fórmulas |

**Dual pipeline CRM:** intencional (pessoa × deal), documentado — não consolidado à força.

---

## Conversões (Bloco 3)

| Fluxo | Status 28.8 |
|-------|-------------|
| Lead → cliente comercial | **Homologável** — `planLeadToCliente` + `convertLeadToClienteAction` (tenant scoped, revalidate, sem duplicar cadastro) |
| Opp → orçamento | `aguardando_integracao` (explícito) |
| Orçamento → venda / OS | `aguardando_integracao` (explícito) |
| Demais (compra/estoque/OS fatura) | Fora do escopo de feature nova; sem stubs falsos de sucesso |

---

## CRUD orçamento / agenda

| Superfície | Situação |
|------------|----------|
| Financeiro `/financeiro/orcamento` | Schema OK; **listagem + variance**; CRUD criar/editar/aprovar **não exposto** (dívida documentada) |
| Agenda `/agenda` | Semana + conflitos; criação enterprise em `agenda_eventos` **não completa**; apontamento para agenda CRM do cliente |

---

## Types

Ver `docs/architecture/PHASE_28_TYPES_AUDIT.md`.

- `supabase gen types`: **FALHOU** (Docker local ausente; `SUPABASE_ACCESS_TOKEN` ausente)
- Merge preservado: `scripts/merge-phase28-database-types.mjs` + `types/database.ts`

---

## Performance / Segurança / Database

| Tema | Achado | Ação |
|------|--------|------|
| Performance | Sem gargalo medido novo; sem otimização especulativa | Nenhuma |
| Segurança | Deny de supply executivo agora é UI; Owner pode ainda não ter grant DB para supply dashboard (snapshot RBAC) — **ressalva** | Documentado; não expandido RBAC seed remoto |
| Database | Sem SQL remoto; migrations Phase 28 já aplicadas (28.7) | Sem migration nova |

---

## UI / UX / A11y / Responsivo

- Screenshots reais: **43** PNG em `docs/testing/evidence/28-8/`
- Viewports: desktop / notebook / tablet / mobile; dark / light
- UUID amostra body: **0**
- Convert button com `aria-label`
- Sem redesign / sem mudança de paleta

---

## Homologação autenticada

Script: `scripts/homolog-28-8-browser.mjs`  
`browser-report.json`: **47 PASS · 0 FAIL · 43 shots · 0 UUID · 0 console material**

Rotas principais (200): dashboard, CRM, compras, estoque, OS, agenda, financeiro (CFO/aging/orçamento/DRE/caixa), analytics, produtos/serviços, metas, configurações, vendas, inteligência, tributário.

---

## Testes (0 FAIL nos executados)

| Suite | Resultado |
|-------|-----------|
| `test:phase28` (all) | **94 PASS · 0 FAIL** |
| `lint` | **0 errors** (27 warnings pré-existentes) |
| `build` | **PASS** |
| `test:rbac` | 92 PASS |
| `test:finance-core` | 53 PASS |
| `test:crm-core` | 47 PASS |
| `test:supply-core` | 39 PASS |
| `test:inventory-core` | 15 PASS |
| `test:analytics-core` | 51 PASS |
| `test:intelligence-contracts` | 11 PASS |
| `test:release-candidate` | 64 PASS |

Scripts `test:phase28-*` individuais existem e são cobertos pelo `all`.

---

## Scores (0–10)

| Área | Nota |
|------|------|
| Arquitetura | 8 |
| Performance | 7 |
| Segurança | 8 |
| Database | 8 |
| TypeScript | 7 |
| UI | 8 |
| UX | 7 |
| Acessibilidade | 7 |
| Responsividade | 8 |
| Estabilidade | 8 |
| Production Readiness | 7 |

---

## Dívida técnica / pendências

### Bloqueantes para PRODUCTION READY

1. CRUD fino orçamento financeiro (criar/editar/aprovar/arquivar)
2. CRUD enterprise agenda (`agenda_eventos` create/edit/recorrência UI)
3. Wiring conversões opp→orçamento e orçamento→venda/OS
4. Regenerar types oficiais com token Supabase + diff

### Não bloqueantes

- Centros de resultado: schema sem UI
- Forecast: sem rota dedicada
- Dual agenda (`cliente_agendamentos` × `agenda_eventos`) até unificação
- Casts `as never` residual em CRM legado
- Possível gap de grants RBAC no snapshot do usuário de teste para `compras/executivo` (UI agora segura)

### Migrations recomendadas

Nenhuma crítica nova. Pré-Fase 29: opcional seed/sync de permissões Owner se grants DB estiverem desatualizados (somente após evidência).

---

## Pronto para?

| Ação | Status |
|------|--------|
| 1. Commit único Fase 28 | **SIM** (quando o usuário solicitar) — working tree contém a Fase 28 completa |
| 2. Push | **NÃO executar agora** — aguardar commit + revisão humana |
| 3. Deploy | **NÃO** — ressalvas de CRUD/conversões/types |
| 4. Início Fase 29 | **SIM, com ressalvas** — após commit; itens bloqueantes de PRODUCTION READY podem entrar no backlog 29 |

**Este relatório não executa** commit, push, deploy nem Fase 29.
