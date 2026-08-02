# Fase 28 — Relatório consolidado (Sprints 28.1–28.6)

**Data:** 2026-08-02  
**Tenant alvo:** `teste-renato-01`  
**Working tree:** alterações locais (sem commit / push / deploy / SQL aplicado)  
**Classificação:** **APROVADO COM RESSALVAS**

---

## Resumo executivo

A Fase 28 productizou e universalizou módulos operacionais reutilizando fontes canônicas (clientes, CRM oportunidades, Supply 25, estoque, OS, financeiro/caixa/DRE). Foram criadas rotas, motores puros, RBAC, migrations idempotentes e suites `test:phase28-*`.

**Não** se declara encerramento pleno: migrations não aplicadas, homologação autenticada incompleta (rotas retornam 307 sem sessão), screenshots reais pendentes, e vários fluxos de conversão/orçamento/agenda enterprise aguardam Sprint 28.7.

---

## Classificação final

| Critério | Status |
|----------|--------|
| Migrations aplicadas | **Não** (arquivos prontos) |
| Testes Phase 28 | **90 PASS · 0 FAIL** |
| Build | **OK** |
| Lint (scoped, sem `.next`) | **0 errors** |
| Regressão core (rbac/finance/crm/supply/inventory/analytics/RC) | **0 FAIL** |
| Homologação browser autenticada | **Parcial** (dev up; rotas 307 sem cookie) |
| Screenshots multi-viewport | **Pendentes** (pastas criadas) |
| Mocks externos fingindo integração | **Não** |

**Veredito:** APROVADO COM RESSALVAS

---

## 28.1 CRM Enterprise V2

### Implementado
- Inbox de leads sobre `clientes` (`estagio_funil=lead`) — `/crm/leads`
- Lista de oportunidades — `/crm/oportunidades`
- Fila de follow-ups — `/crm/follow-ups`
- Indicadores ao vivo + catálogo — `/crm/indicadores`
- Contratos de conversão e canais externos (`lib/crm/phase28/conversion.ts`)
- Nav CRM estendida (leads, oportunidades, follow-ups, agenda)

### Reutilizado
- `clientes`, `crm_oportunidades`, `CrmDashboardService`, pipeline/kanban existentes, GF/UI

### Migrations
- `20260802_phase28_crm_rbac_fields.sql` (**pendente aplicação**)

### Testes
- `npm run test:phase28-crm` — PASS

### Limitações / pendências
- Dual pipeline (`estagio_funil` vs `crm_oportunidades`) não unificado
- Conversão oportunidade→orçamento / OS: contrato `aguardando_integracao`
- Campos avançados de lead dependem da migration
- Drag-and-drop pipeline: reutiliza kanban existente; unificação visual na 28.7

---

## 28.2 Compras Enterprise V2

### Implementado
- Fluxo NEXT: `cotacao → comparacao` no client de pedidos
- Indicadores com contagens ao vivo — `/compras/indicadores` (`data-phase28`)

### Reutilizado
- `compras_pedidos`, cotação/comparação Supply 25, nav Supply

### Migrations
- Nenhuma nova obrigatória (depende de migrations Fase 25 se ausentes)

### Testes
- `npm run test:phase28-purchases` — PASS

### Limitações / pendências
- Mapa comparativo / alçada / recebimento parcial: base Fase 25; UX profunda e ranking fornecedores na 28.7
- Economia/lead time ainda majoritariamente catálogo

---

## 28.3 Estoque Enterprise V2

### Implementado
- Curva ABC — `/estoque/abc` (valor em estoque)
- Reposição sugerida — `/estoque/reposicao` (**não** gera pedido)
- Links no hub de estoque

### Reutilizado
- `produtos.estoque_*`, motores puros `classifyAbcCurve` / `suggestReposicao`

### Migrations
- Depósitos/lotes: pré-existentes Fase 25/2543 (se aplicadas)

### Testes
- `npm run test:phase28-inventory` — PASS

### Limitações / pendências
- Motor ainda centrado em `produtos.estoque_atual`
- ABC por margem/consumo/filial incompleto
- Inventário cego / FEFO UI: schema ahead of productização plena

---

## 28.4 Ordem de Trabalho Universal

### Implementado
- Templates por segmento — `/ordens/templates`
- `tipo_ordem` no formulário de abertura + schema + patch pós-RPC
- Labels/subnav “Templates OT”; descrição OS generalizada

### Reutilizado
- `ordens_servico`, RPC `abrir_os_com_cliente_atomico`, fluxo oficina

### Migrations
- `20260802_phase28_work_order_tipo.sql` (**pendente**)

### Testes
- `npm run test:phase28-work-orders` — PASS

### Limitações / pendências
- Veículo ainda obrigatório na abertura integrada (oficina-safe)
- Templates tenant DB (`ordem_trabalho_templates`) só após migration + UI CRUD 28.7
- Portal público / assinatura: contratos apenas

---

## 28.5 Agenda Enterprise

### Implementado
- Rota top-level `/agenda` com visão semana + detecção de conflitos
- Ponte para `cliente_agendamentos` se `agenda_eventos` ausente
- Item Sidebar Agenda
- Lib `detectAgendaConflicts`

### Reutilizado
- Agenda CRM / clientes

### Migrations
- `20260802_phase28_agenda_resources.sql` (**pendente**)

### Testes
- `npm run test:phase28-schedule` — PASS

### Limitações / pendências
- Views dia/mês/lista/recursos: parcial (semana + links)
- Recorrência / override com justificativa: motor básico; UI completa 28.7
- Google/Outlook: explícito “aguardando integração”

---

## 28.6 Financeiro Enterprise V2

### Implementado
- Dashboard CFO — `/financeiro/cfo` (saldo caixa + aging parcial)
- Aging — `/financeiro/aging`
- Orçamento — `/financeiro/orcamento` (schema-aware + motor orçado×realizado)
- Nav financeira: CFO, Aging, Orçamento
- Permissões + implicações legadas em `rbac-compat`

### Reutilizado
- Cash Intelligence, Contas a Receber, DRE/Fluxo intactos

### Migrations
- `20260802_phase28_finance_budget.sql` (**pendente**)

### Testes
- `npm run test:phase28-finance` — PASS

### Limitações / pendências
- CRUD orçamento / aprovação / centros de resultado UI incompletos
- Aging limitado a 1 página (50 títulos) por `FINANCEIRO_MAX_PER_PAGE`
- Forecast cenários: reutiliza caixa existente; UI CFO é hub, não substitui engines

---

## Arquitetura transversal

| Tema | Estado |
|------|--------|
| Multi-tenant | `requireTenant` / `tenant_id` nas páginas novas |
| RBAC | Novas chaves CRM/agenda/financeiro/OS; sem bypass |
| Soft delete | Padrão existente preservado |
| Integrações externas | Contratos `nao_configurado` / `aguardando_integracao` |
| Identidade visual | Logo/paleta/Dashboard Executivo não reconstruídos |

---

## Migrations necessárias (ordem)

1. `supabase/migrations/20260802_phase28_crm_rbac_fields.sql`
2. `supabase/migrations/20260802_phase28_work_order_tipo.sql`
3. `supabase/migrations/20260802_phase28_agenda_resources.sql`
4. `supabase/migrations/20260802_phase28_finance_budget.sql`

Ver `docs/architecture/PHASE_28_MIGRATIONS.md`.

---

## Testes executados

| Suite | Resultado |
|-------|-----------|
| `test:phase28` (+ 12 scripts individuais) | **90 PASS · 0 FAIL** |
| `test:rbac` | 92 PASS · 0 FAIL |
| `test:finance-core` | 53 PASS · 0 FAIL |
| `test:crm-core` | 47 PASS · 0 FAIL |
| `test:supply-core` | 39 PASS · 0 FAIL |
| `test:inventory-core` | 15 PASS · 0 FAIL |
| `test:analytics-core` | 51 PASS · 0 FAIL |
| `test:intelligence-contracts` | 11 PASS · 0 FAIL *(script `test:intelligence-core` **não existe**)* |
| `test:release-candidate` | 64 PASS · 0 FAIL |
| `npm run build` | OK |
| `npm run lint` (com ignore `.next`) | 0 errors · warnings pré-existentes |

**Total FAIL declarado nas suites acima:** 0

---

## Homologação browser (`teste-renato-01`)

- Dev server local ativo (`localhost:3000`).
- Smoke HTTP nas rotas Phase 28: **307** (redirect login) — sessão não disponível neste agente.
- Screenshots desktop/notebook/tablet/mobile/dark/light: **não capturados** (pastas `docs/testing/evidence/28/{crm,purchases,inventory,work-orders,schedule,finance}/` criadas).

---

## Ações manuais necessárias

1. Aplicar as 4 migrations Phase 28 no Supabase (ordem acima).
2. Regenerar `types/database.ts` após schema.
3. Login autenticado em `teste-renato-01` e homologar fluxos (checklist do brief).
4. Capturar screenshots reais nas pastas de evidência.
5. **Não** commit/push/deploy até revisão da 28.7 (conforme pedido).

---

## Recomendações Sprint 28.7 (pente-fino)

1. Unificar pipeline funil × oportunidades.
2. Wiring conversão lead→cliente (action) e oportunidade→orçamento.
3. Completar agenda (dia/mês/recursos/recorrência/override).
4. CRUD orçamento + orçado×realizado com DRE drill-down.
5. OS sem veículo para templates não-oficina.
6. Compras: recebimento parcial UX + ranking fornecedores.
7. Estoque: ABC multi-critério + depósitos no motor.
8. Homologação autenticada + screenshots + gate APROVADO EM RUNTIME.
9. Aging paginado / export.
10. Regenerar types e validar RLS pós-migration.

---

## Arquivos principais (criados/alterados)

### Docs
- `docs/architecture/PHASE_28_ENTERPRISE.md`
- `docs/architecture/PHASE_28_MIGRATIONS.md`
- `docs/testing/evidence/28/REPORT.md`

### Migrations
- `supabase/migrations/20260802_phase28_*.sql` (4 arquivos)

### Libs
- `lib/crm/phase28/*`, `lib/agenda/conflict.ts`, `lib/estoque/abc/abc-curve.ts`
- `lib/finance/aging/aging.ts`, `lib/finance/budget/budget-variance.ts`
- `lib/ordens/work-order/templates.ts`
- RBAC / finance permission types / rbac-compat

### UI / rotas
- CRM: leads, oportunidades, follow-ups, indicadores
- `/agenda`, estoque abc/reposicao
- financeiro cfo/aging/orcamento
- ordens/templates + form `tipo_ordem`
- nav: sidebar agenda, finance nav, CRM nav, OS subnav

### Tests
- `scripts/phase28-tests.mjs` + scripts npm `test:phase28-*`
