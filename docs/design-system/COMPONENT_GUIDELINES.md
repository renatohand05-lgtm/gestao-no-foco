# Component Guidelines — Gestão

> Gate 19.5

## Regra oficial

**Nenhum componente novo deve ser criado quando existir equivalente oficial.**

Antes de criar:

1. Verificar biblioteca (`components/executive`, `components/brand`, showcase)
2. Verificar variante existente
3. Preferir composição
4. Justificar tecnicamente
5. Documentar no Design System / showcase
6. Adicionar teste (preflight ou unitário)

Componentes fora da biblioteca = **experimentais** até revisão.

## Oficiais (preferir)

`ExecutivePage` · `ExecutiveHeader` · `ExecutiveSection` · `ExecutiveCard` · `MetricCard` · `ExecutivePanel` · `ExecutiveTable` · `ExecutiveBadge` · `ExecutiveButton` · `ExecutiveIconButton` · `ExecutiveFilter` · `ExecutiveDivider` · `ExecutiveLoading` · `ExecutiveSkeleton*` · `ExecutiveEmptyState` · `BrandSplash` · `BrandLogo` · `BrandMark`

## Antipadrões

- `blue-600` / hex soltos
- Novo card com shadow arbitrária
- SkeletonCard em rota (usar BrandSplash)
- Duplicar EmptyState
- Montar compose/services no showcase

## Checklist a11y

- [ ] Focus ring (`gofFocusRing`)
- [ ] `aria-label` em icon buttons
- [ ] Contraste Brand
- [ ] Disabled / loading com `aria-busy`
- [ ] Dialog/Sheet com título e descrição
- [ ] Respeitar `prefers-reduced-motion`

## Checklist responsividade

- [ ] Sem scroll horizontal
- [ ] `min-w-0` / `overflow-x-hidden` em shells
- [ ] Hit target ≥ 44px (`min-h-11`)
- [ ] Validar 390 / 768 / 1366 / 1440 / 1920

## Checklist revisão

- [ ] Usa `gof*` ou Executive*
- [ ] Sem SQL / services / loaders novos
- [ ] Empty / loading / error cobertos
- [ ] Entrada no showcase + catálogo

## Deprecação

1. Marcar no Legacy Audit do showcase
2. Documentar substituto
3. Congelar novos callers
4. Remover em sprint de cleanup (não nesta)
