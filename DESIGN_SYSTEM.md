# Design System — Gestão

> **Gate 19.0** — Fundação `gof*`  
> **Gate 19.0.1** — Brand — [`BRAND_GUIDE.md`](./BRAND_GUIDE.md)  
> **Gate 19.0.2** — UI Polish + Hardening  
> **Gate 19.1+** — Enterprise UI Migration  
> **Gate 19.5** — Showcase + biblioteca oficial

Fundação visual oficial. Sem regras de negócio, SQL, APIs ou services.

---

## Showcase (Gate 19.5)

| Item | Valor |
|------|-------|
| Rota | `/{tenant}/design-system` |
| Acesso | `owner` · `admin` (redirect dashboard se negado) |
| Menu cliente | Não — link só em Configurações (técnico) |
| Dados | Nenhum dado de negócio / sem Supabase extra |
| Catálogo | `lib/design-system/catalog/showcase-catalog.ts` |
| Docs | `docs/design-system/*` |

```bash
npm run test:design-system
```

---

## Cobertura Gate 19.1+

| Módulo | Status |
|--------|--------|
| Dashboard Executivo | Migrado |
| IA Executiva | Migrado |
| Inteligência Comercial | Migrado |
| Financeiro / OS (UI) | Wave 2 parcial |
| CRM / Estoque | Pendente |

### Componentes oficiais

`ExecutivePage` · `ExecutiveHeader` · `ExecutiveSection` · `ExecutiveCard` · `MetricCard` · `ExecutivePanel` · `ExecutiveBadge` · `ExecutiveButton` · `ExecutiveFilter*` · `ExecutiveLoading` · `ExecutiveSkeleton*` · `ExecutiveEmptyState` · `Brand*` · tokens `gof*`

### Regra

Nenhum componente novo se existir equivalente oficial. Ver [`docs/design-system/COMPONENT_GUIDELINES.md`](./docs/design-system/COMPONENT_GUIDELINES.md).

### Legados

Ver showcase **Legacy Audit** e [`docs/design-system/LEGACY_COMPONENTS.md`](./docs/design-system/LEGACY_COMPONENTS.md).

---

## Arquitetura de tokens

| Camada | Prefixo | Uso |
|--------|---------|-----|
| Brand / Foundation | `gof*` + primitives | Fonte da verdade |
| Executive (legado) | `ex*` | Só onde não migrado |
| Legacy | `ds*` | Telas antigas |

Detalhes: [`docs/design-system/TOKENS.md`](./docs/design-system/TOKENS.md) · migração: [`docs/design-system/MIGRATION_GUIDE.md`](./docs/design-system/MIGRATION_GUIDE.md).
