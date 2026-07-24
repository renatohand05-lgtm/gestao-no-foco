# Components — Gestão

Biblioteca oficial e showcase interno (Gate 19.5).

## Rotas

| Rota | Acesso |
|------|--------|
| `/{tenant}/design-system` | owner · admin |
| Configurações → card Design System | owner · admin |

## Pastas

| Path | Conteúdo |
|------|----------|
| `components/brand` | BrandMark, BrandLogo, BrandSplash |
| `components/executive` | Primitivos Enterprise (barrel) |
| `components/design-system/showcase` | UI do showcase |
| `lib/design-system` | Tokens `gof*` (+ legado `ex*`/`ds*`) |
| `lib/design-system/catalog` | Catálogo estático para testes |

## Docs

- [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md)
- [BRAND_GUIDE.md](../../BRAND_GUIDE.md)
- [COMPONENT_GUIDELINES.md](../../docs/design-system/COMPONENT_GUIDELINES.md)
- [TOKENS.md](../../docs/design-system/TOKENS.md)
- [MIGRATION_GUIDE.md](../../docs/design-system/MIGRATION_GUIDE.md)
- [LEGACY_COMPONENTS.md](../../docs/design-system/LEGACY_COMPONENTS.md)

## Teste

```bash
npm run test:design-system
```
