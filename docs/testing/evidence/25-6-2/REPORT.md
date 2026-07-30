# Sprint 25.6.2 — PremiumGlobalLoader

## Classificação

**APROVADO** — loading global mostra apenas o símbolo G oficial.

## Componente

`components/brand/premium-global-loader.tsx`

- Asset: `/brand/icon-192.png`
- Tamanho: `clamp(3.5rem, 8vw, 7rem)` (~56–112px)
- Fundo: `--brand-navy` + vinheta + halo dourado radial
- Animação: fade-in, scale 0.96→1, pulso ~1.7s, halo conic lento (só o anel)
- `prefers-reduced-motion`: G estático + fade curto
- A11y: `role="status"`, `aria-live="polite"`, texto em `.sr-only`

## Integrações

| Ponto | Antes | Depois |
|-------|-------|--------|
| `app/loading.tsx` | BrandSplash completo | PremiumGlobalLoader |
| Auth / tenant / dashboard / financeiro / vendas / metas / observabilidade | BrandSplash + textos | PremiumGlobalLoader |
| `RouteLoading` / `WorkspaceLoading` | BrandSplash | PremiumGlobalLoader |
| `GlobalLoader` | spinner + texto | overlay G + fade-out 200ms / min 250ms |
| `BrandSplash` | wordmark + Enterprise + slogan + barra | delega ao PremiumGlobalLoader |
| `DashboardExecutiveLoading` | BrandSplash “Carregando dashboard…” | PremiumGlobalLoader |
| Login Suspense fallback | BrandSplash | PremiumGlobalLoader |

## Loaders locais preservados

Skeletons de cards/tabelas (`skeleton-card`, suspense de blocos do dashboard, timeline de atividade) **não** foram substituídos pelo G fullscreen.

## Removido do loading global

- Wordmark GESTÃO
- Enterprise
- Slogan
- Barra de progresso
- Texto visível “Carregando…”
- Spinner `Loader2`

## Testes

| Suite | Resultado |
|-------|-----------|
| `test:premium-loader` | 0 FAIL |
| `test:brand-experience` | 0 FAIL |
| `test:responsive-shell` | 0 FAIL |
| `test:visual-contract` | 0 FAIL |
| `test:dashboard-premium` | 0 FAIL |
| lint | PASS |
| build + TypeScript | PASS |

## Evidências

`docs/testing/evidence/25-6-2/`

- loader desktop / notebook / tablet / mobile
- reduced motion
- sequência fade-in / pulse / fade-out

## Restrições

Sem migration, SQL, git add/commit/push/deploy. Working tree apenas.
