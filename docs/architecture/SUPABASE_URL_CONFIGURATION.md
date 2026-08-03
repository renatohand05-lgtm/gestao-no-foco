# Supabase URL configuration (convites / auth)

Configuração **manual** no Dashboard Supabase (Authentication → URL Configuration).  
O Agent não altera o projeto remoto.

## Site URL

```
https://gestao-no-foco.vercel.app
```

## Redirect URLs (allowlist)

```
https://gestao-no-foco.vercel.app/**
https://gestao-no-foco.vercel.app/api/auth/callback
https://gestao-no-foco.vercel.app/convite/**
```

Opcional em preview: URL do deployment Vercel preview correspondente.

## App env (Vercel)

```
APP_URL=https://gestao-no-foco.vercel.app
NEXT_PUBLIC_APP_URL=https://gestao-no-foco.vercel.app
```

Não configure `localhost` nessas variáveis em Production.

## emailRedirectTo

Cadastro web (`RegisterForm`) usa `siteConfig.url` → `/api/auth/callback?next=/onboarding`.  
Convites de equipe usam `absoluteAppUrl('/convite/[token]')` no servidor.

## Mobile (se aplicável)

Ver `docs/architecture/MOBILE_SUPABASE_REDIRECT_URLS.md` (`gof://auth/reset`, `gof://auth/callback`).
