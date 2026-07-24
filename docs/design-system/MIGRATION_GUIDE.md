# Migration Guide — Design System

> Gate 19.5

## De `ex*` / `ds*` → `gof*`

| Legado | Oficial |
|--------|---------|
| `exTypography.*` | `gofTypography.*` |
| `exAnimations.focusRing` | `gofFocusRing` |
| `exAnimations.fade` | `gofMotion.fade` |
| `exRadius[20]` / `exRadius.full` | `gofRadius.lg` / `gofRadius.sm` |
| `exShadow.card` | `gofCardSurface` + `gofShadow.sm` |
| `exColors.*.soft` | `gofColors.*.soft` |
| `dsElevation.*` | `gofCardSurface` |
| `dsSpace.section` | `gofSpaceY.lg` |
| `bg-blue-600` | `bg-[var(--brand-graphite)]` ou `gofColors.primary` |

## De componentes UI → Executive

| Legado | Oficial |
|--------|---------|
| `SectionCard` | `ExecutiveSection` / `ExecutiveCard` |
| `PageHeader` | `ExecutiveHeader` |
| `SkeletonCard` (rota) | `BrandSplash` |
| `SkeletonCard` (bloco) | `ExecutiveSkeleton` |
| `EmptyState` (ui) | `ExecutiveEmptyState` |
| `StatusBadge` | `ExecutiveBadge` |
| `ActionButton` | `ExecutiveButton` |

## Processo por tela

1. Substituir shell → `ExecutivePage` + `ExecutiveHeader`
2. Seções → `ExecutiveSection panel`
3. KPIs → `MetricCard` / `ExecutiveKpiCard`
4. Tabelas → `ExecutiveTable`
5. Remover `blue-*` / `ex*` locais
6. Validar a11y + responsivo
7. Atualizar showcase se novo primitivo

## Não migrar junto

- Compose / services / SQL / cálculos
- Permissões
- Auth
