# Sprint 28.7 — Homologação pós-migration · Relatório final

**Data:** 2026-08-02  
**Tenant:** `teste-renato-01` (Owner, sessão autenticada Playwright)  
**Working tree:** sem commit / push / deploy / SQL remoto  

## Classificação final

**APROVADO COM RESSALVAS**

Motivo de não usar *APROVADO EM RUNTIME PÓS-MIGRATION* puro: schemas e rotas principais validados com sessão real e 0 FAIL nos testes; ainda há dívida funcional conhecida da Fase 28 (conversão server-side incompleta, CRUD de orçamento/agenda enterprise fino, dual pipeline). Ressalvas explícitas abaixo — não escondidas.

---

## Migrations aplicadas (confirmado pelo usuário + probe runtime)

| Migration | Status runtime |
|-----------|----------------|
| Agenda `20260802_phase28_agenda_resources.sql` | **OK** (`agenda_eventos` / `agenda_recursos`) |
| OT `20260802_phase28_work_order_tipo.sql` | **OK** (`tipo_ordem`, `ordem_trabalho_templates`) |
| Finance `20260802_phase28_finance_budget.sql` | **OK** (`finance_budgets*`, `centros_resultado`) |
| CRM `20260802_phase28_crm_rbac_fields.sql` (28.6.1) | **OK** (`crm_oportunidades` + colunas lead/cliente) |

Evidência: `docs/testing/evidence/28-7/schema-validation.json` — **18 PASS · 0 FAIL**

---

## Schema validado

### CRM
- `crm_oportunidades` acessível + `centro_custo_id` / `tags`
- `clientes` Phase 28: consentimento, prioridade, valor potencial, próxima ação
- Soft delete / `tenant_id` usados nas queries

### Agenda
- `agenda_eventos`, `agenda_recursos` ativos (UI: “Schema 28.5: Ativo”)
- Conflitos: motor puro; semana vazia no tenant (0 eventos) — esperado

### Ordem de Trabalho
- `ordens_servico.tipo_ordem` / `template_key`
- `ordem_trabalho_templates` presente

### Financeiro
- `finance_budgets`, `finance_budget_lines`, `centros_resultado` presentes

### Isolamento
- Filtro por `tenant_id` validado via service role (sem leak lógico no probe)

---

## Types regenerados

- `supabase gen types` **bloqueado** sem `SUPABASE_ACCESS_TOKEN`
- Alternativa canônica usada: `scripts/merge-phase28-database-types.mjs`
- `types/database.ts` atualizado com tabelas/colunas Phase 28
- Casts temporários removidos em: `agenda/page.tsx`, `financeiro/orcamento/page.tsx`, `ordens/actions.ts`, `oportunidade-service` (`.from`)
- Persistentes: `cliente_agendamentos` / `cliente_tarefas` / inserts CRM stages ainda usam `as never` onde o tipo gerado legado não cobre 100%

---

## Homologação autenticada (browser)

Script: `scripts/homolog-28-7-browser.mjs`  
Evidência: `docs/testing/evidence/28-7/browser-report.json`

| Métrica | Valor |
|---------|-------|
| Sessão | **autenticada** |
| Rotas checadas | 39+ |
| Status | todas **200**, sem redirect login, sem 404 |
| UUID na UI (amostra body) | **0 hits** |
| Screenshots | **39** PNG |

### Módulos (leitura / navegação real)

| Módulo | Resultado |
|--------|-----------|
| CRM leads / oportunidades / follow-ups / indicadores / pipeline / kanban | OK |
| Compras hub / pedidos / cotações / indicadores | OK |
| Estoque hub / ABC / reposição / inventário | OK |
| Ordens lista / nova / templates | OK (`/ordens/nova` **200** autenticado) |
| Agenda semana + CRM agenda | OK |
| Financeiro CFO / aging / orçamento / caixa / DRE / fluxo | OK |
| Regressão dashboard / vendas / clientes / produtos / analytics / inteligência / tributário | OK |

Viewports amostrados: desktop dark/light, notebook, tablet, mobile.

---

## Bugs encontrados e corrigidos

| Bug | Correção |
|-----|----------|
| Labels crus `ordem_de_servico` na coluna Origem dos leads | `labelOrigemCrm` / `labelPrioridadeCrm` em `lib/crm/phase28/leads-inbox.ts` + UI leads |
| Types Phase 28 ausentes em `database.ts` | merge script + patch Update clientes |
| Casts `as never` desnecessários pós-types | removidos nas páginas Phase 28 críticas |

### Observações não bloqueantes
- 404 históricos em log do `dev` para `/ordens/nova` e `/vendas/nova` **sem sessão** / cache antigo — **não reproduzidos** com auth válida (200).
- Capital de giro R$ 0,00 no CFO: valor do engine (não inventado).
- Agenda com 0 eventos na semana: estado vazio real.
- Orçamento sem linhas cadastradas: schema ok, CRUD fino pendente.

---

## Screenshots

Pasta: `docs/testing/evidence/28-7/{crm,purchases,inventory,work-orders,schedule,finance,regression}/`

Inclui: pipeline, oportunidades, follow-ups, indicadores, compras, estoque ABC/reposição, OS nova/templates, agenda semana, CFO/aging/orçamento/DRE, regressão dashboard/vendas/analytics, dark/light e viewports amostrais.

---

## Testes (todos 0 FAIL)

| Suite | Resultado |
|-------|-----------|
| `test:phase28` (todas as 12) | **91 PASS · 0 FAIL** |
| `test:phase28-crm` | 14 PASS · 0 FAIL |
| `test:rbac` | 92 PASS · 0 FAIL |
| `test:finance-core` | 53 PASS · 0 FAIL |
| `test:crm-core` | 47 PASS · 0 FAIL |
| `test:supply-core` | 39 PASS · 0 FAIL |
| `test:inventory-core` | 15 PASS · 0 FAIL |
| `test:analytics-core` | 51 PASS · 0 FAIL |
| `test:intelligence-contracts` | 11 PASS · 0 FAIL *( `test:intelligence-core` **não existe** )* |
| `test:release-candidate` | 64 PASS · 0 FAIL |
| `npm run build` | OK |
| `npm run lint` (ignore `.next`) | **0 errors** |

**Total FAIL nas suites executadas: 0**

---

## Pendências / dívida (explícitas)

1. Conversão oportunidade→orçamento / OS: contrato `aguardando_integracao` (action server na sequência).
2. Dual pipeline (`estagio_funil` × `crm_oportunidades`) não unificado.
3. Agenda: views dia/mês/lista/recursos/recorrência UI incompletas.
4. Orçamento: listagem schema-ready; CRUD/aprovação/orçado×realizado com DRE drill-down incompletos.
5. Regenerar types oficialmente com `supabase gen types` quando houver `SUPABASE_ACCESS_TOKEN`.
6. Homologação CRUD *escrita* pontual (criar evento agenda, versão orçamento, oportunidade) recomendada em smoke manual adicional.
7. Compras recebimento/divergência deep UX e ranking fornecedores.

---

## Riscos

- Baixo após migrations aplicadas.
- Médio: dívida de unificação CRM e conversões pode confundir operação comercial.
- Types merge manual pode divergir se o schema remoto evoluir sem re-gen oficial.

---

## Preparação para commit único (não executado)

Arquivos relevantes no working tree incluem:
- migrations Phase 28 (CRM corrigida 28.6.1)
- pages/libs Phase 28
- `types/database.ts` mesclado
- scripts `homolog-28-7-*`, `merge-phase28-database-types.mjs`, `phase28-tests.mjs`
- evidências `docs/testing/evidence/28/` e `28-7/`
- docs de arquitetura Phase 28

**Não** foi feito `git add` / `commit` / `push` / deploy.

### Sugestão de mensagem (quando o usuário autorizar)

```
feat(enterprise): homologar Fase 28 pós-migration e pente-fino 28.7

Valida schemas CRM/Agenda/OT/Finance no runtime, regenera types Phase 28,
corrige labels de origem no CRM e registra evidências autenticadas 28-7.
```

---

## Scripts úteis desta sprint

```bash
node --experimental-strip-types scripts/homolog-28-7-schema.mjs
node scripts/merge-phase28-database-types.mjs
node scripts/homolog-28-7-browser.mjs   # requer npm run test:login + npm run dev
npm run test:phase28
```
