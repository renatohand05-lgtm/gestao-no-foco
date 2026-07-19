# Dashboard Streaming — Sprint 9.8.3

Separação do Dashboard Executivo em blocos independentes com Suspense, sem alterar regras de negócio, RPCs, migrations ou resultados financeiros.

---

## Fluxo anterior (pré-streaming)

1. `page.tsx` aguardava `requireTenant` + `getCurrentProfile` + `getDashboard` (payload único).
2. `getDashboard` carregava KPIs, gráficos pesados, rankings, qualidade e inteligência na mesma árvore.
3. A página só renderizava após o payload completo — seções secundárias bloqueavam Hero/KPIs.

### Dependências reais (inalteradas)

| Bloco | Depende de |
|-------|------------|
| Hero (texto/período) + KPIs | `getPrimaryData` |
| Health Score / prioridades / alertas | primary + rankings + qualidade |
| Gráficos leves (fluxo) | primary (`fluxoCharts`) |
| Gráficos pesados | `getHeavyChartSeries` (+ fluxo do primary) |
| Rankings | `getRankingsData` |
| Qualidade operacional | `getQualityData` |
| Exportação | payload completo (`loadDashboardFull`) |

---

## Fluxo atual

```
page (filtros da URL)
  └─ Suspense (shell)
       └─ DashboardStreamingRoot (tenant + profile + filterOptions)
            ├─ Header + filtros (imediato)
            │    └─ ExportActionsBlock (Suspense → loadDashboardFull)
            └─ DashboardStreamingView
                 ├─ PrimaryBlock (Suspense) → Hero + KPIs
                 │    └─ HeroInsights (Suspense aninhado → intelligence)
                 ├─ IntelligenceBlock (Suspense)
                 ├─ CommercialPanelBlock (Suspense) — Painel Comercial 9.8.7+
                 ├─ ChartsBlock (Suspense)
                 ├─ RankingsBlock (Suspense)
                 └─ QualityBlock (Suspense)
```

Ordem visual: Hero/filtros → KPIs → inteligência → painel comercial → gráficos → rankings → qualidade.

---

## Loaders (`lib/dashboard/dashboard-loaders.ts`)

Memoização **por request** via `React.cache` (sem cache financeiro cross-request):

- `loadDashboardPrimary`
- `loadDashboardCharts` (reusa primary + heavy series)
- `loadDashboardRankings`
- `loadDashboardQuality`
- `loadDashboardIntelligence` (reusa primary + rankings + quality)
- `loadDashboardFull` (exportação; reusa os loaders acima)

---

## Isolamento de falhas

- Erro em seção secundária → `SectionError` local; demais blocos seguem.
- Erro crítico em KPIs → `SectionError` no bloco primário (não silenciado).
- Exportação só libera botões após `loadDashboardFull` (evita export incompleto).

---

## Skeletons

Fallbacks com altura similar ao conteúdo final (`DashboardHeroSkeleton`, `DashboardSummaryCardsSkeleton`, seções de charts/rankings/intelligence/qualidade, skeleton de exportação). Sem spinner genérico.
