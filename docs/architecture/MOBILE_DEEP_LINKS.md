# Mobile Deep Links (Auth)

## Scheme
`gof://`

## Supported (31.1 / 31.1.1)
| Path | Uso |
|------|-----|
| `gof://auth/reset` | Password recovery callback (`resetPasswordForEmail` redirectTo) |
| `gof://auth/callback` | Auth callback genérico (handler interno) |

## Not implemented (do not configure yet)
| Path | Status |
|------|--------|
| `gof://auth/recovery` | Sem código dedicado |
| `gof://auth/invite` | Sem código dedicado |

## Supabase Redirect URLs
Configuração manual: `docs/architecture/MOBILE_SUPABASE_REDIRECT_URLS.md`

## Rules
- Only allowlisted paths
- No open redirect to arbitrary http(s)
- Tokens from URL not logged
- After handling, navigate to in-app route under guards
