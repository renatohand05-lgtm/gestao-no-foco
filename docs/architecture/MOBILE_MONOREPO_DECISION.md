# Mobile Monorepo Decision

**Escolhido (31.0.1):** npm workspaces oficiais — Next na raiz + `apps/mobile` + `packages/*`.

**React unificado:** `19.2.3` via `overrides` (Expo SDK 57 + Next 16).

**Turborepo:** ativo para `typecheck`/`lint`/`build` incremental.

**Não feito:** mover web para `apps/web` (ainda alto risco Vercel).
