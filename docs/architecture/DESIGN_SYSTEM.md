# Design System — Gestão no Foco

**Sprint 10.1 — Executive Design System** (infra)  
**Sprint 10.2 — Painel Comercial** (primeira adoção visual)  
**Sprint 10.3 — Refinamento visual & microinterações** (UX premium, só apresentação)  
**Sprint 10.4A — Blueprint do Dashboard Executivo Premium** (só documentação; ver [`EXECUTIVE_DASHBOARD_BLUEPRINT.md`](./EXECUTIVE_DASHBOARD_BLUEPRINT.md))  
**Sprint 10.4B — Implementação do Dashboard Executivo Premium** (UI only; ordem do blueprint)  
**Sprint 10.5 — Executive Visual Polish** (aparência premium; zero regra de negócio)  
**Sprint 10.6 — Executive Experience (Apple quality)** (hierarquia, storytelling, glass discreto, motion)  
**Escopo 10.1:** infraestrutura visual premium. Sem mudança de loaders, RPCs ou regras de negócio.  
**Escopo 10.2:** wrappers `Executive*` + tokens `ex*` no Painel Comercial — só apresentação.  
**Escopo 10.3:** hierarquia, profundidade, ícones, gauge, gráficos/heatmap/insights/rankings refinados; zero mudança de regra de negócio.  
**Escopo 10.4A:** arquitetura visual e wireframes — **sem** implementação de UI.  
**Escopo 10.4B:** implementação visual do Dashboard na ordem Hero → KPIs → Performance → Evolução → Diário → Heatmap → Insights → Rankings → Footer.  
**Escopo 10.5:** polish visual (gradientes, tipografia, shimmer, seções com identidade).  
**Escopo 10.6:** experiência cinematográfica — leitura sem esforço, glass pontual, stagger, storytelling.

---

## Camadas

| Camada | Prefixo | Uso |
|--------|---------|-----|
| Legacy / atual | `ds*` em `tokens.ts` | Telas existentes (Dashboard, Financeiro, etc.) |
| Executive (novo) | `ex*` | Componentes em `components/executive/` — adoção gradual nas sprints seguintes |

**Regra:** Sprint 10.1 **não** migra telas. Apenas prepara tokens e componentes.

---

## Tokens executivos (`lib/design-system/`)

| Arquivo | Export | Conteúdo |
|---------|--------|----------|
| `colors.ts` | `exColors` | Primary `#2563eb`, success, warning, danger, info (roxo), neutros |
| `spacing.ts` | `exSpacing`, `exPadding*`, `exStack` | 8 · 12 · 16 · 20 · 24 · 32 |
| `radius.ts` | `exRadius` | 12 · 16 · 20 · 24 (+ full) |
| `shadow.ts` | `exShadow` | xs · sm · md · lg · xl (+ card, cardHover, elevated, hero, glow) |
| `typography.ts` | `exTypography` | Display, Heading, Hero, Title, Subtitle, Body, Caption, Label, Metric, kpi* |
| `animations.ts` | `exAnimations` | fade, slide, scale, count, progress, hoverLift, hoverGlow, shimmer |

Re-exportados em `lib/design-system/index.ts` junto com `ds*` (compatível).

### Paleta

| Tom | Hex de referência | Uso |
|-----|-------------------|-----|
| Primary | `#2563eb` | CTAs, foco, hero |
| Success | `#16a34a` | Positivo / atingido |
| Warning | `#ea580c` | Atenção / ritmo |
| Danger | `#dc2626` | Crítico / negativo |
| Info | `#7c3aed` | Informativo / insights |

---

## Componentes (`components/executive/`)

| Componente | Função |
|------------|--------|
| `ExecutiveHero` | Hero de página com eyebrow, título, ações |
| `ExecutiveCard` | Superfície de card (opcional interactive) |
| `ExecutiveMetric` | KPI label + valor + hint |
| `ExecutiveSection` | Bloco com título/descrição |
| `ExecutiveStatus` | Chip de status semântico |
| `ExecutiveProgress` | Barra de progresso (aria progressbar) |
| `ExecutiveGauge` | Gauge SVG semicírculo (complementar ao %) |
| `ExecutiveBadge` | Badge/pill |
| `ExecutiveHeader` | Header compacto de módulo |
| `ExecutiveDivider` | Separador (com ou sem label) |

Import canônico:

```ts
import { ExecutiveCard, ExecutiveMetric } from "@/components/executive";
import { exColors, exTypography } from "@/lib/design-system";
```

---

## Animações

| Token | Efeito |
|-------|--------|
| `fade` | Entrada fade |
| `slide` | Fade + slide from bottom |
| `scale` | Zoom-in suave |
| `count` | Prep tipográfica para contadores |
| `progress` | Transição de `width` em barras |

Sem dependência de dados financeiros. Contadores animados client-side ficam para sprints de adoção.

---

## O que NÃO foi feito (intencional)

- Nenhuma tela alterada
- Loaders / services / RPCs / DRE / Fluxo / Dashboard intactos
- `tokens.ts` (`ds*`) preservado para não regressar UI atual
- Sem migration / banco

---

## Sprint 10.2 — Painel Comercial (adoção visual)

**Escopo:** redesign visual-only do Painel Comercial (`components/dashboard/comercial/`).  
Sem alteração de loaders, services, props de dados, formatação numérica, drill-downs ou cálculos.

| Mudança | Detalhe |
|---------|---------|
| Wrappers | `ExecutiveHero`, `ExecutiveSection`, `ExecutiveCard`, `ExecutiveMetric`, `ExecutiveProgress`, `ExecutiveBadge` |
| Tokens | `exStack`, `exSpacing`, `exRadius`, `exTypography`, `exAnimations` |
| Status | Helper `comercial-status-badge.tsx` — mapeia `MetaVendasStatus` → Excelente / Atenção / Abaixo / Crítico (apresentação) |
| Charts | Barras do dash diário / heatmap mantêm cores e matemática; só o layout externo migrou |

`lib/metas/*`, `dashboard-loaders`, tipos de negócio e hrefs de drill-down **intactos**.

---

## Sprint 10.3 — Visual refinement & microinteractions

### Auditoria visual (antes)

| Achado | Ação |
|--------|------|
| Hero sem resposta rápida (como estou / quanto falta / projeção) | Hero com meta, realizado, restante, %, gauge e status |
| KPIs sem hierarquia primaria/secundária | Grids Primários (números maiores + ícones) vs Secundários compactos |
| Cards com sombra/borda inconsistentes | `ExecutiveCard` + `exShadow.card` / hoverLift |
| Progresso sem detalhe contextual | `ExecutiveProgress` com `detail` + faixas por tom |
| Heatmap sem legenda / dia atual fraco | Legenda + anel “hoje” + FDS tracejado |
| Dash diário / acumulado pouco diferenciados | Cores + área leve + destaque do dia atual |
| Insights densos sem prioridade visual | Accent lateral + badge + CTA |
| Rankings sem posição visual | Badge 1–3 + barras + empty state |
| Hover/focus ausentes em vários links | `exAnimations.focusRing` / `hoverLift` / `hoverPress` |
| Reduced motion só via utilitário | Reforço global em `globals.css` |

### Entregas 10.3

- `ExecutiveGauge` (SVG, acessível, sem lib pesada)
- Ícones via `comercial-metric-icons.ts` (chaves → Lucide no boundary client)
- Tipografia `kpiPrimary` / `kpiSecondary`
- Animações: `motion-safe:` + `prefers-reduced-motion` global
- Tokens semânticos `exColors` (positivo / atenção / crítico / info / neutro)

**Não alterado:** DB, migrations, SQL, RPCs, loaders, services, cálculos, projeções, DRE, Fluxo, filtros, drill-downs, exportações.

---

## Sprint 10.5 — Executive Visual Polish

**Escopo:** aparência premium (Stripe / Linear / Vercel) no Dashboard Executivo. Zero mudança funcional.

### Decisões visuais

| Tema | Decisão |
|------|---------|
| Hero | Gradiente slate→white→blue, orbs de luz, `exShadow.hero`, métricas em mini-cards glass, progress `lg` |
| Cards | Raio `exRadius[20]`, borda `/40`, sombra suave em camadas, hover glow azul discreto |
| Tipografia | Escala com `heading`; `kpiPrimary`/`kpiSecondary` dominam; labels uppercase tracking largo |
| Cores | Semântica `exColors` apenas; seções com `panel` (`bg-muted/20`) para evitar “tudo branco” |
| Seções | `ExecutiveSection panel` + `ExecutiveDivider` com label entre blocos |
| Skeleton | `exAnimations.shimmer` + keyframe `ex-shimmer` em `globals.css` |
| Empty | Ícone grande + título + subtítulo + CTA (não só texto) |
| Espaçamento | Shell `max-w-[90rem]` + padding lateral + `exStack[32]` |
| Charts | Legenda com dots, eixo tracejado, área sob realizado, highlight do último ponto |
| Reduced motion | Mantido (`motion-safe:` + media query global) |

### Consistência

- Mesmo raio de card (`20`) em seções premium  
- Padding padrão `20`/`24`  
- Gaps da escala `8·12·16·20·24·32`  
- Hover: `hoverLift` + `hoverGlow`  

**Não alterado:** loaders, services, cálculos, DRE, Fluxo, metas, filtros, exportações, APIs.

---

## Sprint 10.6 — Executive Experience (Apple quality)

**Escopo:** elevar a experiência para leitura “sem esforço”. Zero mudança funcional.

### Decisões

| Tema | Decisão |
|------|---------|
| Hero cinematográfico | Multilayer gradient + radial glow + dot texture; mini-cards glass flutuantes; ~30–34vh; CTA “Próxima ação” |
| Hierarquia de leitura | Empresa → Meta/Receita/Projeção/Gap → Performance → Evolução → Operação → Problemas → Oportunidades → Ações |
| Glassmorphism | Só `exGlass` no Hero (panel/soft/badge/progress) — nunca em todos os cards |
| Motion | `exStagger()` + fade/slide/scale/float; easing suave; reduced-motion preservado |
| Insights | Categorias Crítico / Importante / Positivo / Informativo com superfícies próprias + ordenação visual |
| Empty | Ilustração SVG leve + ícone + copy + CTA |
| Notebook-first | Grid 2×2 em lg antes de 4 cols; shell `max-w-[88rem]` |

### Storytelling (dividers)

`Empresa → Meta` → `Performance` → `Evolução` → `Operação · problemas` → `Oportunidades · ações`

**Não alterado:** banco, loaders, services, cálculos, DRE, Fluxo, projeções, metas, filtros, exportações.

---

## Sprint 13.2 — Executive Product Excellence

Hero cockpit (risco/oportunidade). Narrativa Performance→Insights. KPI altura uniforme. Botões/filtros Stripe-like. Canvas `#ebecef`. Empty states premium. Zero alteração funcional.

---

## Sprint 13.1 — Executive Product Polish

**Escopo:** design pass final — Hero V3, Sidebar Linear, KPI/Action/canvas. Zero funcionalidade.

| Tema | Decisão |
|------|---------|
| Hero V3 | 3 colunas: Empresa/Status/Resumo · Score/Progress/Confiança · Receita/Meta/Gap/Projeção/Decisão |
| Sidebar | Grupos Principal/Operação/Gestão/Sistema; active branco; ícones stroke 1.75 |
| Ação | Card ~2× peso visual; CTA slate-900 |
| Canvas | Shell `#e8eaee`; cards brancos elevados |
| KPIs | Metric LG nos primários; hover lift suave |

**Não alterado:** banco, SQL, RPC, APIs, cálculos, BI, EI, Prediction, Timeline, Copilot, engines de Workspace/Layout/Action.

---

## Sprint 13.0 — Product Experience (Premium Edition)

**Escopo:** percepção premium (Apple / Stripe / Linear). Zero funcionalidade nova.

Auditoria: [`SPRINT_13_PRODUCT_EXPERIENCE_AUDIT.md`](./SPRINT_13_PRODUCT_EXPERIENCE_AUDIT.md)

### Decisões

| Tema | Decisão |
|------|---------|
| Hero | Painel de comando dark; Receita Metric XL; Score central; decisão em teaser |
| KPIs | 5 primários XL + 5 secundários; sparkline; trend badge discreta |
| Ação | Card “Recomendação da diretoria” com hierarquia própria |
| Cards | Fundo `#fafbfc`, sombra `elevated`, borda quase invisível |
| Canvas | `#eef0f3` — fim do branco ERP |
| Tipografia | Metric XL/LG; sectionTitle discreto |
| Densidade | Executivo · Confortável · Compacto revisados |

**Não alterado:** banco, loaders, RPCs, APIs, serviços, cálculos, motores.

---

## Validação

```bash
npm run lint
npm run build
```

Referências: [UI_STANDARD.md](./UI_STANDARD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [EXECUTIVE_DASHBOARD_BLUEPRINT.md](./EXECUTIVE_DASHBOARD_BLUEPRINT.md)
