# Sprint 25.6.1 — Homologação visual

## Causa raiz

1. **Breakpoint errado:** `xl:grid-cols-6` (1280px) forçava 6 KPIs no notebook (1366/1440), esmagando valores.
2. **Fluxo de caixa:** `DashboardDualBarChart` com `min-w-[28rem]` + `overflow-x-auto` gerava scrollbar horizontal.
3. **Central de Inteligência:** lista longa com `max-h` + scroll em coluna estreita.
4. **Shell:** `max-w-[96rem]` (~1536px) abaixo do alvo 1600–1760px.
5. **Landing:** hero com ícone pequeno e preview em modo skeleton/compacto.

## Componentes reconstruídos

| Área | Antes | Depois |
|------|-------|--------|
| Grid dashboard | 6 KPIs desde xl; main 6/3/3 | KPI `2xl:6 · lg:3 · md:2`; main `2xl 7/3/2`, notebook chart full + 60/40 |
| KPI | `ExecutiveKpiCard` + truncate | `PremiumKpiCard` + `tabular-nums` + `clamp` + `formatCurrencyCompact` |
| Gráfico | `DashboardLineChart` embutido | SVG área próprio, escala com padding, marcador último ponto |
| Inteligência | scroll estreito, até 6 | 3 insights + Ver todos |
| Fluxo | DualBar `min-w-[28rem]` | resumo empilhado + CashSpark sem overflow |
| Landing hero | icon96 + compact preview | wordmark oficial + preview em escala |
| Shell | `max-w-[96rem]` | `--dashboard-max-width: 1760px` |
| Header app | ícones colidindo | menu **Mais** abaixo de xl |

## Tokens

`--dashboard-max-width`, `--dashboard-gutter`, `--dashboard-gap`, `--kpi-min-width`, `--panel-min-height`, `--gold-primary`, `--surface-1/2/3`

## Evidências

`docs/testing/evidence/25-6-1/` — landing 1920/1440/1366/tablet/mobile; dashboard dark/light 1440; dark 1920/1366/tablet/mobile.

## Matriz de comparação

| Elemento | Referência | Anterior (25.6) | Nova (25.6.1) | Status |
|----------|------------|-----------------|---------------|--------|
| logo | Wordmark + símbolo | ícone/hero fraco | wordmark header/hero/sidebar | IGUAL OU SUPERIOR |
| hero | 1ª dobra equilibrada | vazio inferior | min 88vh + preview maior | IGUAL OU SUPERIOR |
| primeira dobra | logo+CTAs+provas+mock | mock skeleton | mock estruturado | IGUAL OU SUPERIOR |
| KPIs | 1 valor/linha, sem corte | 6 cols notebook | 3×2 notebook, 6 no 2xl | IGUAL OU SUPERIOR |
| gráfico | plotagem útil | área vazia | escala com padding + empty | IGUAL OU SUPERIOR |
| inteligência | painel executivo | scroll estreito | 3 cards + Ver todos | IGUAL OU SUPERIOR |
| fluxo | legível sem overflow-x | DualBar overflow | spark + compact | IGUAL OU SUPERIOR |
| sidebar | wordmark / mark | ok parcial | wordmark expandido | IGUAL OU SUPERIOR |
| header | sem colisão notebook | ícones densos | Mais + busca icon | IGUAL OU SUPERIOR |
| tema escuro | superfícies / gold | remendos | tokens surface | IGUAL OU SUPERIOR |
| tema claro | fundo quente | #eef1f5 | mantido | IGUAL OU SUPERIOR |
| notebook | 3 KPIs × 2 | 6 esmagados | 3×2 | IGUAL OU SUPERIOR |
| mobile | 1 coluna | parcial | 1 col + OK checks | IGUAL OU SUPERIOR |

## Classificação

**APROVADO VISUALMENTE**

Checks Playwright (12/12 OK): sem overflow de página no conteúdo premium, sem overflow no fluxo, sem KPI cortado (landing + dashboard 1920/1440/1366/tablet/mobile; dark + light 1440).

## Gate de testes

| Suite | Resultado |
|-------|-----------|
| test:dashboard-layout-final | 33 PASS · 0 FAIL |
| test:kpi-no-truncation | 15 PASS · 0 FAIL |
| test:no-horizontal-overflow | 11 PASS · 0 FAIL |
| test:landing-hero-final | 17 PASS · 0 FAIL |
| test:premium-polish | PASS |
| test:dashboard-density | PASS |
| test:dark/light-theme-contract | PASS |
| test:executive-experience | PASS |
| test:brand-experience | PASS |
| test:dashboard-premium | PASS |
| test:responsive-shell | PASS |
| test:visual-contract | PASS |
| test:landing-premium | PASS |
| test:analytics/finance/crm/supply-core | PASS |
| test:rbac | PASS |
| test:release-candidate | PASS |
| lint | PASS |
| build + TypeScript | PASS |

**Total FAIL: 0**

