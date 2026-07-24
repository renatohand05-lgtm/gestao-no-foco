# Legacy Components — Gestão

> Gate 19.5 · Não remover exports automaticamente nesta sprint.

## Tokens legado

| Item | Status | Substituto |
|------|--------|------------|
| `ex*` | pendente migração | `gof*` |
| `ds*` | legado | `gof*` |
| `blue-*` | legado | Brand / gofColors |

## Componentes

| Item | Status | Substituto | Risco remoção |
|------|--------|------------|---------------|
| `SkeletonCard` | legado | BrandSplash / ExecutiveSkeleton | baixo |
| `EmptyState` (ui) | duplicado | ExecutiveEmptyState | baixo |
| `ActionButton` / Save / Cancel | duplicado | ExecutiveButton | baixo |
| `ExecutiveHeroV2` + painéis v2 | órfão | Wave 1 streaming | baixo |
| `dashboard/comercial/**` | deprecado | Commercial Intelligence | baixo |
| `executive/copilot` | órfão | DecisionCenter | baixo |
| `executive/action-center` | órfão | ActionPlan | baixo |

## Recomendação

Ver tabela completa no showcase → **Legacy Audit** (`/{tenant}/design-system#legacy`).

Cleanup dedicado sugerido: Wave 3+.
