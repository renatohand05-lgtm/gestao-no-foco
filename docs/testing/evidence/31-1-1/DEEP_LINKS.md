# Sprint 31.1.1 — DEEP_LINKS

## Scheme

`gof` — `apps/mobile/app.config.ts`

## Paths implementados

| URL | Handler |
|-----|---------|
| `gof://auth/reset` | `handleAuthDeepLink` → `/(auth)/reset` |
| `gof://auth/callback` | `handleAuthDeepLink` → `/(auth)/reset` (callback genérico) |

## Não implementados (não configurar no Supabase ainda)

- `gof://auth/recovery`
- `gof://auth/invite`

## Controles

- Sem `Linking.openURL` para http(s) arbitrário nos fluxos auth auditados
- Sem `window.location` open redirect
- Guards de sessão/tenant/branch/RBAC permanecem no app shell
- Testes: `test:phase31-mobile-deep-links`

## Android intent filters / iOS URL types

Gerados pelo Expo a partir de `scheme: "gof"` no prebuild/dev client.
Validação em device: **pendente** (sem Android SDK nesta máquina).
