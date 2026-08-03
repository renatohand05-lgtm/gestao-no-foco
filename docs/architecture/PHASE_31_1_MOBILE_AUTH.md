# Fase 31.1 — Mobile Auth Enterprise

## Fluxo escolhido (híbrido)

```
Mobile App
  ├─ Supabase Auth (anon) ── signIn / refresh / resetPassword / signOut
  │     tokens em SecureStore
  └─ API Next /api/mobile/v1/* (Bearer access_token)
        ├─ /me
        ├─ /memberships
        ├─ /tenants/:id/branches
        └─ /tenants/:id/permissions
```

## Tokens

- Access + refresh somente em **SecureStore**
- Nunca AsyncStorage / logs / URL
- Refresh single-flight no client Supabase

## Sessão

Estados: `booting` → `unauthenticated` → `authenticating` →
`authenticated_without_tenant` → `authenticated_without_branch` → `authenticated`
(+ `refreshing`, `expired`, `revoked`, `offline_limited`, `error`)

## Tenant / Filial

- Tenants: memberships reais (`tenant_members`)
- Filiais: API retorna lista vazia + `allowContinueWithoutBranch: true` (sem tabela filiais)
- Troca limpa QueryClient + revalida RBAC

## Biometria

Opt-in · desbloqueio local de sessão já válida · não substitui auth server-side

## Recovery / Deep links

- `resetPasswordForEmail` + scheme `gof://auth/reset`
- Guards: auth → tenant → branch → permission

## Offline limitado

Somente shell/perfil/tenant/filial em cache se sessão prévia válida

## Riscos / limitações

- Filiais reais aguardam modelo de dados futuro
- Password recovery depende de redirect URLs configuradas no Supabase
- iOS biometria: readiness estática no Windows
