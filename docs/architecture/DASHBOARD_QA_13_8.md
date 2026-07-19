# Dashboard Executive — QA Design & UX (Sprint 13.8)

Auditoria e polish exclusivo de qualidade. Sem novas features. Sem alteração de motores, APIs, banco ou persistência.

## Auditoria (Fase 1–4) — resumo

### Fortalezas
- Tokens `ex*` bem definidos (tipografia, motion, shadow, radius, spacing).
- Hierarquia Hero → Action Center → módulos.
- `ExecutiveSectionState` como base de empty/error/loading.
- DnD editor (13.7) com estados e a11y sólidos.

### Problemas encontrados
| Área | Achado |
|------|--------|
| Tokens | Action Center, Hero, Copilot, Heatmap com valores arbitrários |
| Shadows | `ExecutiveCard` prioridade fora de `exShadow` |
| Empty | Timeline / Copilot / Action Plan retornavam `null` |
| A11y | `tabIndex` em card sem ativação; targets &lt;44px na top bar/toolbar |
| Contraste | Labels do Hero em `white/30–35` |
| Motion | Heatmap `scale-110` / `duration-200` fora do sistema |
| Loading | Shell `max-w-7xl` vs canvas `88rem`; Suspense incompleto |
| Tipografia | Títulos locais `text-sm font-semibold` sem `exTypography` |

## Melhorias aplicadas

1. Tokens de sombra `priority*` / `critical` / `warningElevated`; `touchTarget` e `focusRingInverse`.
2. `ExecutiveCard` → shadows tokenizadas; removido focus trap sem handler.
3. Action Center, Section, Copilot → radius/padding/cores/`exTypography`.
4. Empty states unificados (Timeline, Copilot, Action Plan, Prediction empty/error).
5. Hero contraste de captions; grid interno com `exRadius[20]`.
6. Top bar / toolbar / tabs → `min-h-11` / `size-11`.
7. Heatmap → `exMotion` + `hoverScale` + `min-h-11`.
8. Suspense/loading com placeholders extras e mesma max-width do shell.

## Arquivos principais alterados

- `lib/design-system/shadow.ts`, `animations.ts`
- `components/executive/ExecutiveCard.tsx`, `ExecutiveSection.tsx`
- `components/executive/action-center/executive-action-card.tsx`
- `components/executive/timeline|copilot|action-plan/*`
- `components/executive/predictions/prediction-*-state.tsx`
- `components/dashboard/executive/executive-{hero-v2,heatmap-v2,section-state}.tsx`
- `components/executive/workspace/executive-top-bar.tsx`
- `components/executive/layout/executive-layout-toolbar.tsx`
- `components/dashboard/dashboard-streaming.tsx`
- `components/executive/intelligence/executive-intelligence-section.tsx`
- `components/executive/copilot/copilot-card.tsx`

## Não alterado (confirmação)

- Banco / SQL / migrations / RPC / APIs / services
- DRE / Financeiro / BI / EI / Prediction / Timeline / Copilot **engines**
- Workspace Engine / Layout Engine / Persistência / Drag & Drop logic
- Cálculos e regras de negócio

## Limitações remanescentes (aceitáveis nesta sprint)

- Charts com scroll horizontal (`min-w-[42–48rem]`) — affordance deliberada.
- Células do heatmap em mobile ainda densas (melhoradas, mas grid 7-col é intrínseco).
- Nem todos os módulos legado usam 100% `exTypography` (débito residual baixo impacto).
- Cross-browser validado por padrões CSS modernos; smoke manual recomendado em Safari.

## Critérios de aceite

- Visual mais homogêneo (Apple/Linear/Stripe/Notion de acabamento)
- Estados empty/loading cobertos nos módulos críticos
- A11y targets principais ≥44px
- Lint / Build limpos
- Zero mudança em regras de negócio
