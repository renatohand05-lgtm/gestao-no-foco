# Fase 31.0 — Mobile Foundation Enterprise

## Decisão

**Web permanece na raiz** (Next.js).
**Mobile** em `apps/mobile` (Expo + Expo Router).
**Packages** em `packages/*` (código multiplataforma puro).

### Motivo

- Migrar web para `apps/web` agora quebraria Vercel, imports `@/` e CI.
- Workspaces incrementais reduzem risco.
- Compartilhamento real via packages sem DOM/Next/server-only.

## Estrutura

```
/
  app/                 # Next.js web (intacto)
  apps/mobile/         # Expo Router app
  packages/
    design-tokens/     # cores hex, spacing, radius, motion
    domain/            # auth states, tenant, offline/push contracts, query keys
    schemas/           # Zod DTOs mobile
    api-contracts/     # client HTTP contracts
    rbac-contracts/    # permission helpers portáveis
    config/            # flags, env shapes, segments portáveis
    utils/             # sanitize, format Intl
```

## Limites de compartilhamento

| Compartilhar | Não compartilhar |
|--------------|------------------|
| types, Zod, tokens hex | Server Components / Actions |
| format Intl | `server-only`, cookies |
| RBAC helpers puros | Supabase service role |
| feature flag keys | componentes HTML/Tailwind |
| API contracts | `next/*`, React `cache` |

## Evolução

1. 31.0 Foundation (esta sprint)
2. 31.1 Auth real + API gateway
3. 31.x Módulos (Dashboard, CRM…)
4. Futuro: mover web → `apps/web` com Turborepo

## Riscos / Rollback

- Workspaces npm: instalar só em `apps/mobile` se root install falhar.
- Rollback: remover `apps/mobile` + `packages/*` + scripts mobile; web intacta.
