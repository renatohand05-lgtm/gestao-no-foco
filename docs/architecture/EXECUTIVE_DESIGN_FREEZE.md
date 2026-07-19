# Executive Design Freeze

**Sprint 13.11 — Design Freeze do Dashboard Executivo**

A partir desta versão, ajustes cosméticos no Dashboard Executivo devem ser excepcionais.  
Próximas sprints: produto, módulos, comercialização e escalabilidade.

---

## Escopo congelado (UI)

Camada visual e de composição apenas. Engines, cálculos, persistência, layout engine e APIs **fora** do freeze de comportamento de negócio — e **não** devem ser alterados por polish cosmético.

## Hierarquia definitiva

1. Executive Cockpit (Hero full-bleed)  
2. Executive Score (protagonista)  
3. Métricas de apoio no Hero  
4. KPIs (ritmo largo → médio → compacto)  
5. Action Center (ação principal)  
6. Insights / Business  
7. Performance · Previsão · Evolução · Timeline  
8. Rankings e demais blocos (Layout Engine / personalização)

## Tokens oficiais

| Família | Uso |
|---------|-----|
| `exTypography.*` | Heading, section, label, caption, metric, scoreHero, metricSupport |
| `exSpacing` / `exPadding` / `exStack` / `exSize` | Ritmo, shells, min-heights, chart scroll |
| `exRadius` | 12 · 16 · 20 · 24 |
| `exShadow.*` | card, action, decision, hero, toolbar, ghost… |
| `exColors.neutral.*` | surface, canvas, muted, border |
| `exAnimations` / `exMotion` | 150–180ms, hover, focus, press, shimmer |
| `exGlass` | Painéis discretos (timeline / copilot) |

Proibido em componentes novos do cockpit: radius/shadow/type/spacing literais fora destes tokens (exceto gradientes atmosféricos do Hero e cores semânticas de status/heatmap).

## Grid final

- Shell: `exSize.shell` (`max-w-[88rem]`) + padding responsivo + `exStack[20]` / `lg:gap-6`  
- Hero: 3 / 5 / 4 colunas (lg), stack em mobile  
- KPIs: 12-col com Receita em 4 cols; secundários em 5 cols  

## Motion

- Hover / focus / press via `exAnimations`  
- `motion-safe` / `prefers-reduced-motion`  
- Sem animações chamativas ou timings ad-hoc

## Acessibilidade (padrão)

- Focus ring (`focusRing` / `focusRingInverse` no Hero)  
- Targets interativos ≥ 44px (`min-h-11` / `touchTarget`)  
- Hierarquia de headings por seção  
- aria-labels em Score, Action, empty/error  
- Badges + texto (não só cor)

## Responsividade

Validado por construção com grid Tailwind breakpoints:  
1920 → 430. Chart strips mantêm scroll horizontal intencional (`exSize.chartScroll*`).

## Componentes auditados (Freeze)

Hero · Score Premium · KPIs · Action Center · Summary/Insight presentation · Risks/Opportunities · BI panel · Timeline · Prediction shells · Toolbar/Editor/Presets · Top bar · Workspace footer · Empty/Loading/Error (`ExecutiveSectionState`) · Skeletons

## Documentação relacionada

- `EXECUTIVE_DESIGN_FINAL.md` (cockpit RC 13.10)  
- `EXECUTIVE_INTELLIGENCE_PRESENTATION.md` (narrativa 13.9)  
- `DASHBOARD_QA_13_8.md` / `DASHBOARD_QA_13_8_1.md`  
- `DASHBOARD_DRAG_DROP.md` / `DASHBOARD_LAYOUT_PERSISTENCE.md`

## Declaração de Freeze

**Design Freeze decretado após aprovação formal do CTO nesta sprint.**

Alterações futuras de UI no Dashboard Executivo exigem justificativa de produto (acessibilidade/regressão/bug), não preferência estética isolada.
