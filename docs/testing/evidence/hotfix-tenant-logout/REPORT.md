# Hotfix — Seletor de empresas + Logout

## Causas raiz

### ERRO 1 — Tenant switcher
`DropdownMenuItem` usava `render={<Link href=... />}`. No Next.js 16 + React 19 em produção, o Base UI clona o elemento via `render.props` **antes** de desembrulhar `React.lazy` do `Link`, o que pode lançar e cair no error boundary ao **abrir** o menu (itens montam no open).

### ERRO 2 — Logout
Após `signOut`, `router.push("/login")` + `router.refresh()` re-renderizavam o layout RSC ainda sob rota `/{tenant}/…` sem sessão estável, gerando falha de render e error boundary. Não havia guard de idempotência nem hard navigation.

## Correções

| Arquivo | Mudança |
|---------|---------|
| `components/layout/tenant-switcher.tsx` | Troca via `router.push`; sem Link no `render`; empty/error/loading; papel amigável |
| `components/layout/user-nav.tsx` | `signOut({ scope: "global" })` + `window.location.assign("/login")`; loading; idempotente |
| `components/layout/route-error.tsx` | Remove `render={<Link />}` do botão de recuperação |
| `lib/tenants.ts` | `requireTenant` → login se sem user; fallback ao 1º tenant se slug sem membership |

## “Criar nova empresa”

**Existe** apenas o onboarding da **primeira** empresa (`/onboarding` + `createTenantWithOwner`).

Para quem **já tem** membership, `/onboarding` redireciona de volta ao dashboard (middleware + page). Multi-empresa adicional **não** está implementada.

O item “Nova empresa” foi **removido** do switcher (evitava UX falsa).

### Desenho técnico (não implementado agora)

1. Rota dedicada `POST /api/.../tenants` ou server action `createAdditionalTenantAction`.
2. Gate RBAC: apenas `owner` (não há papel `superadmin` no catálogo atual — `owner|admin|manager|member`).
3. Reutilizar `createTenantWithOwner` + validações de slug.
4. Após criar, invalidar `getUserTenants` cache e `router.push` para o novo slug.
5. Auditoria + limite de tenants por plano (futuro).

## Antes / Depois

| Fluxo | Antes | Depois |
|-------|-------|--------|
| Abrir setas da empresa | Error boundary | Menu com lista segura |
| Trocar empresa | Crash / Link render | `router.push` + loading |
| Sair | Error boundary | Sign-out + hard `/login` |
| URL sem membership | onboarding genérico | 1º tenant próprio ou onboarding |

## Testes

`node scripts/hotfix-tenant-switcher-logout-tests.mjs`

## Git

Correção **local, sem commit**. Separada da Sprint 31.3 já publicada em `main`.
