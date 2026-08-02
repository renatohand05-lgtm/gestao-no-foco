# Relatório Sprint 29.9 — Homologação profunda e liberação

**Data:** 2026-08-02  
**Checkpoint base:** `92f1f13` — `feat(enterprise): concluir arquitetura e homologação da Fase 29`  
**Branch:** `main` (ahead 1 de `origin/main` no início; working tree com artefatos 29.9)  
**Tenant:** `teste-renato-01`  
**Papel da sessão:** Owner  

## Classificação final

**LIBERADO COM RESSALVAS NÃO BLOQUEANTES**

| Decisão | Valor |
|---------|--------|
| Pronto para push | **SIM** (com ressalvas abaixo) |
| Pronto para deploy | **NÃO** (aplicar migrations / schema CRM+compras no alvo antes) |
| Pronto para tag | **NÃO** |
| Pronto para Fase 30 | **SIM** (acompanhar débitos de schema e CRUD profundo) |

> Push / deploy / tag **não foram executados** nesta sprint.

---

## 1. Checkpoint validado

| Check | Resultado |
|-------|-----------|
| Branch | `main` |
| HEAD | `92f1f13` |
| Ahead origin | 1 |
| Tracked limpo após checkpoint | SIM |
| Untracked antigos `27-8-*` | permanecem fora |
| MERGE / rebase / cherry-pick | nenhum |

---

## 2. next start

| Campo | Valor |
|-------|--------|
| Comando | `npm run build` → `npm run start -- -p 3001 -H localhost` |
| Porta | **3001** |
| Host | `localhost` (cookies de auth incompatíveis com `127.0.0.1`) |
| Build | EXIT 0 (log: `next-start/build.log`) |
| Ready | ~198 ms |
| Encerramento | processo dedicado 3001 (dev permanece em 3000) |

Validado sob produção local: assets, middleware, sessão, tenant, rotas dinâmicas, lazy/code-splitting (dashboard), hydration sem crash, cookies via `storageState`.

Evidências: `docs/testing/evidence/29-9/next-start/`

---

## 3. CRUDs

### CRM
- Rotas leads / oportunidades / follow-ups / pipeline: **OK**
- Form Novo cliente: **OK**
- **Criar lead:** bloqueado por schema (`coluna ausente` / migrations pendentes) — **BLOQUEADO_AMBIENTE** (sem SQL remoto)
- Converter lead: botão presente e acionado
- Follow-ups: buckets Vencidos / Hoje / Próximos 7 — OK (CRUD dedicado limitado)
- Oportunidade create UI: não wired (action no lib) — LIMITADO

### Kanban (`/clientes/funil`)
- Colunas carregadas; **9 cards**
- Drag/drop exercitado; refresh sem desaparecimento
- **APROVADO**

### Vendas / Orçamento
- Lista, nova, abertas, detalhe: OK
- Form Registrar venda + status Orçamento: OK
- Conversões no detalhe amostrado: botões ausentes no estado atual (não inventado)
- Create full: PROBE (sem forçar órfãos)

### OS
- Lista / nova / detalhe: OK
- Form Abrir OS: OK
- Add item / status `→` no detalhe amostrado: não visíveis no estado (workspace pode exigir scroll/contexto)

### Compras
- Hub / pedidos / cotações / inventário: OK HTTP
- UI indicou **schema pendente** — LIMITADO

### Estoque
- Lista + nova movimentação (Entrada/Saída/Ajuste): OK

### Agenda
- Views dia/semana/mês; create + recorrência semanal submetida; dark/light/mobile: OK
- Timezone produto: America/Sao_Paulo (código)

---

## 4. Exportações (somente reais)

| Módulo | Resultado |
|--------|-----------|
| DRE comparativo (`?comparativo=1`) | CSV + Excel **download OK** + Imprimir/PDF presente |
| Dashboard | menu Exportar → CSV presente |
| Analytics | CSV não encontrado nesta execução; Excel/PDF não afirmados |
| CRM / Vendas / OS / Compras / Estoque / Metas | sem export dedicado verificado — **não afirmado** |

Arquivos: `exports/dre-comparativo-Julho-2026-Agosto-2026.csv` (+ `.xlsx`)

---

## 5. Lighthouse / Web Vitals

Ambiente: Windows · Chromium Playwright · `http://localhost:3001` · next start

| Rota | Fonte | Destaques |
|------|-------|-----------|
| /login desktop | Lighthouse | Perf **0.72** · A11y **0.95** · LCP ~8267 ms · CLS 0 |
| /login mobile | Lighthouse | Perf **0.76** · A11y **0.95** |
| dashboard/crm/financeiro/analytics/dre | Performance API | FCP ~428–1560 ms · TTFB ~274–1249 ms · CLS 0 |

Limitações: Lighthouse autenticado via cookie header falhou (fallback Performance API); LCP nem sempre populado; INP não agregado.

Evidências: `lighthouse/SUMMARY.md`, `lighthouse/REPORT.json`

---

## 6. RBAC multi-perfil

| Item | Status |
|------|--------|
| Sessão Owner | OK — deep links CRM/DRE/compras/estoque/OS/agenda/analytics |
| Admin / Financeiro / Operacional | **não exercitados** — sem credenciais/memberships extras; sem SQL; sem switch de papel na UI |
| Limitação | **não bloqueante para liberação de código**, bloqueante para “RBAC multi-perfil completo” |

---

## 7. Console / Network

| Critério | Resultado |
|----------|-----------|
| HTTP 500 | **0** |
| pageerror | **0** |
| UUID em UI | **0** |
| console.error bloqueante | **0** (1 mensagem de schema filtrada como ressalva de ambiente) |
| Loops / loading infinito | não observados |

---

## 8. Gates automatizados

| Suite | Resultado |
|-------|-----------|
| lint | 0 erros |
| build | EXIT 0 |
| test:phase29 | 206 PASS / 0 FAIL |
| test:release-candidate | 64 PASS / 0 FAIL |
| test:rbac | 0 FAIL |
| test:finance-core | 0 FAIL |
| test:crm-core | 0 FAIL |
| test:supply-core | 0 FAIL |
| test:inventory-core | 0 FAIL |
| test:analytics-core | 0 FAIL |
| test:intelligence-contracts | 0 FAIL |
| test:homolog-29-9 | **83 PASS / 0 FAIL** |
| test:homolog-29-9-lighthouse | **9 PASS / 0 FAIL** |

Scripts criados: `scripts/homolog-29-9-browser.mjs`, `scripts/homolog-29-9-lighthouse.mjs` (+ npm scripts).

---

## 9. Bugs

| Achado | Tipo | Correção de produto? |
|--------|------|----------------------|
| Create cliente/lead — coluna ausente | Ambiente / migration | **Não** (proibido SQL remoto; sem amend do 92f1f13) |
| Compras schema pendente | Ambiente | Não |
| Seletor DRE export no modo normal | Script QA | Ajustado para `?comparativo=1` |

**Commit corretivo de produto:** nenhum (não necessário).

---

## 10. Pendências

### Bloqueantes para deploy/tag
1. Aplicar migrations pendentes (CRM create + compras schema) no ambiente alvo
2. Revalidar create lead/cliente após schema
3. Credenciais/memberships para RBAC multi-perfil (ou aceite formal da limitação)

### Não bloqueantes
- CRUD profundo mutacional completo (venda/OS/compras com dados mínimos)
- Analytics Excel/PDF em preparação
- Lighthouse auth scores completos
- Evidências antigas `27-8-*` ainda untracked

---

## 11. Riscos

- Deploy sem migrations → falha de cadastro CRM
- Assumir multi-perfil sem testes → risco de bypass/menu
- Confundir DRE normal com comparativo ao validar export

---

## Screenshots

44 capturas em `docs/testing/evidence/29-9/{next-start,crud-crm,kanban,vendas-orcamento,ordens,compras,estoque,agenda,exports,rbac,screenshots}/`
