# Sprint 26.1 — REPORT

**Título:** Reconstrução do Cockpit Executivo e Identidade Visual 9.8+  
**Checkpoint base:** `81c2c11` — `feat(ui): premium experience milestone v25.7 checkpoint`  
**Data evidência:** 2026-07-31  
**Working tree:** alterações **não commitadas** (sem `git add` / `commit` / `push`)  
**Classificação final:** **APROVADO COM RESSALVAS**

---

## 1. Veredito

A Sprint 26.1 foi executada de fato no produto: hierarquia do cockpit alterada, Executive Brief novo, KPIs com valor dominante, gráfico autoral, superfícies `gf-*`, Command Center compacto, Central de Inteligência sem scroll interno principal, Business Health/Decision Center/Simulador refinados, continuidade landing→login→loader→dashboard, tema claro ajustado, evidências em `docs/testing/evidence/26-1/` e gate de testes com **0 FAIL**.

Este relatório **não** trata de CRM/RBAC (Sprint 25.7.5). Mudanças de CRM/RBAC que ainda existam no working tree desde sprints anteriores são **ortogonais** e não foram reabertas aqui, salvo o shell (`overflow-x-hidden`) necessário à responsividade do cockpit.

---

## 2. Estado do working tree (desde `81c2c11`)

### 2.1 Escopo visual 26.1 (esta sprint)

| Tipo | Arquivo |
|------|---------|
| **Criado** | `lib/dashboard/executive-brief.ts` |
| **Criado** | `components/dashboard/premium/executive-brief.tsx` |
| **Criado** | `components/ui/gf-surface.tsx` |
| **Criado** | `scripts/cockpit-hierarchy-tests.mjs` |
| **Criado** | `scripts/premium-kpis-v2-tests.mjs` |
| **Criado** | `scripts/authorial-charts-tests.mjs` |
| **Criado** | `scripts/brand-components-tests.mjs` |
| **Criado** | `scripts/visual-depth-tests.mjs` |
| **Criado** | `scripts/executive-narrative-tests.mjs` |
| **Criado** | `scripts/product-continuity-tests.mjs` |
| **Criado** | `scripts/capture-26-1-cockpit.mjs` |
| **Criado** | `docs/testing/evidence/26-1/*` |
| **Alterado** | `components/dashboard/premium/premium-dashboard-view.tsx` |
| **Alterado** | `components/dashboard/premium/premium-kpi-strip.tsx` |
| **Alterado** | `components/dashboard/premium/premium-main-row.tsx` |
| **Alterado** | `components/dashboard/premium/premium-revenue-chart.tsx` |
| **Alterado** | `components/dashboard/executive-command-center/executive-command-center.tsx` |
| **Alterado** | `components/dashboard/business-health/business-health-card.tsx` |
| **Alterado** | `components/dashboard/executive-decision-center/decision-center-panel.tsx` |
| **Alterado** | `components/dashboard/executive-decision-center/simulation-card.tsx` |
| **Alterado** | `app/globals.css` |
| **Alterado** | `lib/design-system/premium-motion.ts` |
| **Alterado** | `app/(marketing)/page.tsx` |
| **Alterado** | `app/(auth)/login/page.tsx` |
| **Alterado** | `components/brand/premium-global-loader.tsx` |
| **Alterado** | `components/layout/app-shell.tsx` |
| **Alterado** | `package.json` (scripts de teste 26.1) |
| **Alterado** | `scripts/visual-consistency-tests.mjs` (aceita wash `#f0f2f6`) |

### 2.2 Fora do escopo 26.1 (ainda no tree, não refeitos)

Arquivos CRM/RBAC de 25.7.3–25.7.5 (ex.: `lib/crm/rbac-compat.ts`, evidence `25-7-5/`) permanecem no working tree por sprints anteriores. **Não fazem parte desta entrega visual.**

---

## 3. Antes × Depois (composição do cockpit)

| Aspecto | Antes (`81c2c11` / v25.7) | Depois (26.1) |
|---------|---------------------------|---------------|
| Hierarquia | Header → KPIs iguais → Main row → Ops → Disclosure | Header → **Executive Brief** → **KPI dominante** → Main row autoral → Ops → Disclosure |
| Brief | Inexistente no topo premium | `ExecutiveBrief` com headline, narrativa, chips e CTA |
| KPIs | Cards simétricos, valor ~1.05–1.55rem | Featured no 1º KPI (`data-kpi-dominant`), tipografia até ~2.35rem, `data-premium-kpis="v2"` |
| Gráfico | Linha ouro simples | Gradiente stroke + fill, badge **Autoral**, `data-chart-authorial` |
| Superfícies | Cards Shadcn/`rounded-2xl` genéricos | Classes `gf-surface` / `gf-kpi` / `gf-cta` + `--gf-depth-*` |
| Command Center | Painéis sempre expandidos | Compacto + `<details>` para metas/forecast/ações |
| Inteligência | Painel padrão | `data-intel-no-scroll`, sem `overflow-y-auto` |
| Business Health | Barras finas | Hero visual + mapa de saúde (`data-health-radar`) |
| Decision Center | Score → wins → matrix → fila → sims | Top score+wins · body fila∥matrix+simulador |
| Simulador | Slider + reset | Slider + barra visual + Mid + Reset, `data-sim-interactive` |
| Continuidade | Implícita | `data-brand-continuity` em landing/login/loader/dashboard |
| Tema claro | `#eef1f5` | `#f0f2f6` wash + tokens `--gf-light-*` |

---

## 4. Mudanças por área

### Cockpit / hierarquia
- Marker `data-dashboard-premium-v261` + `data-cockpit-hierarchy="brief-kpi-chart-ops"`.
- Brief sintetiza dados reais (`buildExecutiveBrief`) — sem `Math.random`.

### KPIs
- Valor dominante no featured; grid `2xl:grid-cols-7` com featured em 2 cols a partir de `lg`.
- Mantém `whitespace-nowrap` + `overflow-x-clip` (contrato anti-ellipsis).

### Gráficos
- `PremiumRevenueChart`: stroke em gradiente, área mais densa, tipografia display no último ponto.

### Componentes / profundidade
- `GfSurface` + CSS Sprint 26.1 (`.gf-surface-*`, `--gf-depth-1..3`).
- Motion: tokens existentes preservados; superfícies `gfAuthorial` / `gfRaised` em `premium-motion.ts`.

### Command Center / Decision / Health / Simulator
- Compactação e reorganização descritas acima; dados continuam dos engines locais.

### Continuidade + a11y + performance
- Marcadores de continuidade; Brief/CTA com `focus-visible:ring`.
- Motion CSS-first (sem libs novas); `prefers-reduced-motion` já coberto.
- Shell: `overflow-x-hidden` + `min-w-0` no inset — corrige overflow horizontal em tablet.

---

## 5. Screenshots reais (`docs/testing/evidence/26-1/`)

Captura: `node scripts/capture-26-1-cockpit.mjs` · tenant `teste-renato-01` · `capture-report.json` com **0 FAIL**.

| Arquivo | Conteúdo |
|---------|----------|
| `landing.png` | Landing pública |
| `login.png` | Login (contexto sem auth) |
| `loader.png` | Frame loader / navegação |
| `dashboard-completo` via `dashboard-desktop.png` / `tema-escuro.png` | Cockpit completo |
| `executive-brief.png` | Executive Brief |
| `kpis.png` | Faixa KPI v2 |
| `chart.png` | Gráfico autoral |
| `dashboard-main-row.png` | Linha gráfico+intel+fluxo |
| `central-inteligencia.png` | Central de Inteligência |
| `command-center.png` | Command Center |
| `business-health.png` | Business Health |
| `decision-center.png` | Decision Center |
| `simulador.png` | Simulador “E se?” |
| `tema-claro.png` / `tema-escuro.png` | Temas |
| `dashboard-desktop.png` / `notebook` / `tablet` / `mobile` | Breakpoints |

**Antes pixel-a-pixel:** não havia pasta `26-1` prévia; a comparação “antes” é estrutural contra `81c2c11` (tabela §3). Ressalva consciente.

---

## 6. Testes novos / gate

Scripts npm adicionados:

- `test:cockpit-hierarchy`
- `test:premium-kpis-v2`
- `test:authorial-charts`
- `test:brand-components`
- `test:visual-depth`
- `test:executive-narrative`
- `test:product-continuity`

### Gate executado (todos **0 FAIL**)

```
npm run lint
npm run build
npm run test:cockpit-hierarchy
npm run test:premium-kpis-v2
npm run test:authorial-charts
npm run test:brand-components
npm run test:visual-depth
npm run test:executive-narrative
npm run test:product-continuity
npm run test:motion-system
npm run test:premium-interactions
npm run test:visual-consistency
npm run test:no-horizontal-overflow
npm run test:kpi-no-truncation
npm run test:dashboard-premium
npm run test:responsive-shell
npm run test:rbac
npm run test:release-candidate
```

Captura browser: **Checks FAIL: 0** · overflow tablet corrigido após `app-shell` overflow-x-hidden.

---

## 7. Limitações reais

1. **Antes visual pixel:** só comparação estrutural vs `81c2c11` (sem screenshots históricos 26.1 “antes”).
2. **Working tree misto:** arquivos CRM/RBAC de 25.7.x coexistentes — não fazem parte desta sprint.
3. **KPI em viewports estreitos:** valores usam `overflow-x-clip`; em grades muito apertadas o featured só amplia a partir de `lg`.
4. **Loader:** frame de navegação pode ser curto; marker `data-brand-continuity="loader"` existe no componente.
5. **Sem commit/deploy:** tudo permanece no working tree, conforme pedido.

---

## 8. Classificação

**APROVADO COM RESSALVAS**

Motivo das ressalvas: comparação before pixel ausente (apenas estrutural) e working tree ainda contém artefatos de sprints RBAC/CRM anteriores. A entrega visual 26.1 em si está implementada, evidenciada e com gate verde.
