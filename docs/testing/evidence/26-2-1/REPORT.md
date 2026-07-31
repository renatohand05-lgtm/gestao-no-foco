# Sprint 26.2.1 — Restauração de contraste e identidade

**Data:** 2026-07-31  
**Tenant evidência:** `teste-renato-01`  
**Base URL:** `http://localhost:3000`  
**Classificação:** **APROVADO COM RESSALVAS**

---

## Missão

Reverter alterações de cor/opacidade/contraste da Sprint 26.2 que descaracterizaram a identidade (marfim `#ebe6df`, superfícies lavadas, badges técnicos), **preservando** a estrutura Signature (GFKpiCockpit, GFExecutiveHeader, GFRevenueChart, GFIcon, organização Command Center / Analytics).

Não criar nova paleta. Voltar ao padrão aprovado da Sprint 26.1 / tokens históricos (`#f0f2f6` claro frio · navy `#0b0f14` · dourado controlado).

---

## O que foi revertido (cor)

| Item | 26.2 (rejeitado) | 26.2.1 (restaurado) |
|------|------------------|---------------------|
| Fundo claro | marfim `#ebe6df` / superfícies quentes | wash frio `#f0f2f6` |
| Superfícies GF | tokens marfim independentes | mapeados a `--background` / `--card` |
| Texto light | contraste fraco / muted lavado | `--text-primary #12151a` · `--text-secondary #3f4754` · muted `#3f4754` |
| Intel panel | superfície “intelligence” lavada | `bg-[var(--card)]` + borda real |
| Cards shadcn | `ring-foreground/10` quase invisível | `border-border` + sombra de elevação |
| Badges UI | AUTORAL / ASSINATURA | removidos da UI de produção |
| Hints Analytics | `high · lib/...` | “Confiança alta/média/baixa” |

## O que foi preservado (estrutura)

- `GFKpiCockpit` (faixa unificada 6 KPIs)
- `GFExecutiveHeader`
- `GFRevenueChart` + linha dourada
- `GFIcon` / `GFInsightCard` / tokens `gfSpace` / motion
- Organização Command Center, Decision Center, Analytics accordion de fontes
- Hierarquia Brief → KPI → chart → ops

---

## Gate de testes (0 FAIL)

| Script | Resultado |
|--------|-----------|
| `test:color-regression` | PASS |
| `test:light-theme-contrast` | PASS |
| `test:dark-theme-identity` | PASS |
| `test:analytics-legibility` | PASS |
| `test:intelligence-legibility` | PASS |
| `test:kpi-no-truncation-v2` | PASS |
| `test:signature-kpi-cockpit` | PASS |
| `test:signature-header` | PASS |
| `test:signature-chart` | PASS |
| `test:signature-depth` | PASS |
| `test:signature-analytics` | PASS |
| `test:visual-consistency` | PASS |
| `test:kpi-no-truncation` | PASS |
| `test:no-horizontal-overflow` | PASS |
| `test:dashboard-premium` | PASS |
| `test:responsive-shell` | PASS |
| `test:rbac` | PASS |
| `test:release-candidate` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |

Captura Playwright: `scripts/capture-26-2-1-color-restore.mjs` → `capture-report.json` (**16 shots · 0 FAIL** · KPI overflow check: 6 métricas sem clip).

---

## Evidências (`docs/testing/evidence/26-2-1/`)

| Arquivo | Conteúdo |
|---------|----------|
| `dashboard-dark.png` | Dashboard tema escuro |
| `dashboard-light.png` | Dashboard tema claro |
| `analytics-dark.png` | Analytics escuro |
| `analytics-light.png` | Analytics claro |
| `central-inteligencia-dark.png` | Intel Top 3 escuro |
| `central-inteligencia-light.png` | Intel Top 3 claro |
| `kpis-desktop.png` | KPI cockpit 1920 |
| `kpis-notebook.png` | KPI 1440 |
| `kpis-mobile.png` | KPI 390 |
| `grafico.png` | GFRevenueChart |
| `tooltip.png` | Tooltip do gráfico |
| `header.png` | GFExecutiveHeader |
| `crm-dark.png` / `crm-light.png` | CRM |
| `financeiro-dark.png` / `financeiro-light.png` | Financeiro |

---

## Gate de aceite (checklist)

| Critério | Status |
|----------|--------|
| Tema claro sem marfim lavado | OK (`#f0f2f6`) |
| Analytics legível (títulos/tabs/cards) | OK com ressalva (densidade de catálogo ainda densa) |
| Central de Inteligência contrastada | OK (card + severidade + tipografia secundária) |
| KPIs sem truncamento de valor | OK (runtime + testes) |
| Cores 26.1 restauradas | OK |
| Estrutura 26.2 preservada | OK |
| Badges técnicos removidos | OK |
| Screenshots reais | OK |
| Contraste WCAG AA em tokens tipográficos | OK nos tokens; catálogo Analytics ainda usa tipografia densa |

---

## Ressalvas

1. **Analytics — catálogo / metas indisponíveis:** textos de “valor ausente” e metas não carregadas permanecem tipograficamente densos (produto/dados), não regressão de paleta marfim.
2. **Severidade pastel no light:** cards de insight usam tint suave de success/warning (intencional para hierarquia); títulos e corpos usam `--text-primary` / `--text-secondary`.
3. **CRM/Financeiro:** captura confirma tema; não houve redesign estrutural nestes módulos nesta sprint.

---

## Classificação final

**APROVADO COM RESSALVAS**

Identidade navy + dourado e tema claro frio restaurados; estrutura Signature 26.2 mantida; gate automatizado em 0 FAIL; evidências reais anexadas. Ressalvas limitadas a densidade tipográfica de catálogo Analytics e tint pastel de severidade no light — não bloqueiam aceite visual da restauração de paleta.
