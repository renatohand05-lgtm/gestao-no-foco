# Executive Design Final — Cockpit Release Candidate

Sprint 13.10 — refinamento visual final. Sem novos motores, cálculos ou dados.

## Hierarquia final

1. **Executive Cockpit (Hero)** — superfície full-bleed, não card isolado  
2. **Executive Score** — protagonista tipográfico + arco  
3. **Métricas de apoio no Hero** — Receita · Meta · Gap · Forecast (`metricSupport`)  
4. **KPIs** — grade com ritmo (Receita larga · demais médios · secundários compactos)  
5. **Action Center** — CTA `lg` / `min-h-12`, headline `headline`  
6. Insights → Performance → Timeline → demais blocos (Layout Engine)

## Hero (estrutura)

| Coluna | Conteúdo |
|--------|----------|
| Esquerda (3/12) | Empresa · status · resumo executivo · confiança |
| Centro (5/12) | Score featured · métricas subordinadas |
| Direita (4/12) | Prioridade (enfatizada) · risco · oportunidade · CTA |

Divisores verticais discretos no desktop; stack elegante no mobile.

## Executive Score

- Token `exTypography.scoreHero`
- Arco SVG visual (sem alteração do valor/status)
- `featured` prop no `ExecutiveScorePremium`
- Status, confiança e tendência existentes

## Tipografia

Tokens usados: `label`, `caption`, `cardTitle`, `title`, `heading`, `headline`, `sectionTitle`, `scoreHero`, `metricSupport`, `metricLg`, `kpiPrimary`/`kpiSecondary`.

## Espaçamento / Size

- `exSize.hero` aumentado
- `exSize.scoreGauge` / `scoreBar`
- `exSize.actionCard` maior
- Shell `exStack[20]` + `lg:gap-6` para respiração

## Motion

Continua 150–180ms via `exAnimations` / `exMotion`. Sem animações chamativas.

## Confirmação

Nenhum cálculo, KPI, motor, banco, API ou dado inventado nesta sprint.
