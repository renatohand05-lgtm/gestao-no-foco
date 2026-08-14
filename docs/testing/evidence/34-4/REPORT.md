# Sprint 34.4 — Jornada de acesso (recuperar senha + convite + e-mail)

**Data fechamento código:** 2026-08-14
**Data homologação production:** 2026-08-14
**Branch:** `main`
**Commit feat:** `ba09b2e`
**Tipo:** P1 acesso — sem billing / Asaas / Storage 34.3 / mobile / 34.5
**34.3:** HOMOLOGADA (sem regressão intencional)

## Status final

**SPRINT 34.4: HOMOLOGADA — GO**

**HOMOLOGADA PRODUCTION:** **SIM**

| Critério | Status |
|---|---|
| RECOVER PASSWORD | **PASS** |
| RESET PASSWORD | **PASS** |
| PASSWORD EMAIL | **PASS** (e-mail real via Supabase Auth) |
| REDIRECTS | **PASS** |
| CALLBACK | **PASS** |
| NOVA SENHA | **PASS** |
| LOGIN COM NOVA SENHA | **PASS** |
| INVITE CREATE | **PASS** |
| INVITE EMAIL | **FALLBACK LINK** (sem envio automático) |
| INVITE ACCEPT | **PASS** |
| EXISTING USER | **PASS** |
| NEW USER | **PASS** |
| MULTIEMPRESA INVITE | **PASS** |
| ROLE VALIDATION | **PASS** |
| PRIVILEGE ESCALATION | **PASS** |
| CROSS-TENANT | **PASS** |
| INACTIVE | **PASS** (reativação explícita no aceite) |
| P0 REGRESSION | **PASS** |
| Billing | **FROZEN SAFE** |

## Homologação production (evidência Renato)

Fluxo validado de ponta a ponta:

1. Solicitar recuperação (`/recuperar`)
2. Receber e-mail real (Supabase Auth)
3. Clicar no link
4. Callback (`/api/auth/callback?next=/nova-senha`)
5. Tela `/nova-senha`
6. Definir nova senha
7. Login com a nova senha

### Supabase URL Configuration (confirmado — não alterar)

| Item | Valor |
|---|---|
| Site URL | `https://gestao-no-foco.vercel.app` |
| Redirect URLs | `gof://auth/reset` |
| | `gof://auth/callback` |
| | `https://gestao-no-foco.vercel.app/api/auth/callback` |
| | `https://gestao-no-foco.vercel.app/api/auth/callback?next=/nova-senha` |

Nenhuma alteração automática no painel Supabase / Vercel / Asaas nesta homologação.

## Fluxo antigo (34.1)

1. Login → link `/login?recuperar=1` **morto** (query ignorada).
2. Sem páginas web `/recuperar` / `/nova-senha`.
3. Convite: `emailSent: false` sempre; UI já sugeria copiar link, mas CTA dizia “Enviar”.
4. Aceite em `/convite/[token]` já existia (hash de token, expiração, e-mail match).

## Correções

### Recuperação de senha

- Link login → `/recuperar` (“Esqueci minha senha”).
- `RecoverPasswordForm`: `resetPasswordForEmail` com `redirectTo` → `/api/auth/callback?next=/nova-senha`.
- Mensagem neutra (anti-enumeração).
- UX de rate limit amigável.
- Callback: destino `/nova-senha` sem open-redirect; falha → `/recuperar?error=invalid_or_expired`.
- `NewPasswordForm`: valida sessão SSR, min 8 chars, confirmação, `updateUser`, `signOut`, login.
- `/nova-senha` **não** está em `AUTH_ROUTES` (evita middleware expulsar sessão de recovery).

### Convite

- Regras puras `lib/equipe/invite-rules.ts` (bloqueia `owner` / role inválida).
- UI: só papéis convidáveis; CTA “Convidar usuário”; banner **sempre** honesto (copiar link).
- `emailSent: false` mantido (envio automático não implementado).
- Inactive: permite novo convite se membership estiver inactive; no aceite **reativa explicitamente** (`status=active`, limpa `deactivated_at`, aplica role do convite).
- Membro já ativo: aceite idempotente (não duplica membership).
- Authz: `assertEquipeAdmin` inalterado (owner/admin; member/inactive/cross-tenant bloqueados).

## Provider de e-mail

| Canal | Situação |
|---|---|
| Password recovery | **Supabase Auth** — **PASS** em production (e-mail real recebido) |
| Convite equipe | **FALLBACK LINK** — sem Resend/SMTP send no código |
| `EMAIL_PROVIDER` / `RESEND_API_KEY` / `SMTP_HOST` | Detectados só para mensagem; **não enviam** |

## Rate limit

Supabase Auth aplica rate limit em `resetPasswordForEmail`. UI trata mensagem de limite. Sem infra adicional.

## Inactive / reinvite (regra real)

- Membro **ativo** com o e-mail: createInvite **bloqueia**.
- Membro **inactive**: createInvite **permite**.
- Aceite de convite legítimo: **reativa** membership (explícito no código/comentário). Não é reativação silenciosa fora do fluxo de convite.

## Migration

**NENHUMA** — `tenant_invitations` e auth existentes bastam.

## Testes (revalidação pós-homologação)

| Suite | Resultado |
|---|---|
| `test:phase34-4-access-journey` | **14 PASS** |
| `test:phase34-2-p0-tenant-rls` | **12 PASS** |
| `test:phase34-3-p1-mutation-auth` | **9 PASS** |
| `test:rbac` | **92 PASS** |
| lint | **PASS** (0 errors, 30 warnings pré-existentes) |
| typecheck (`tsc` via `next build`) | **PASS** |
| build | **PASS** |
| `git diff --check` | **PASS** |

## P1

**Fechados nesta sprint:**

1. Recuperar senha web (código + homologação production)
2. Convite com fallback honesto de link

**Restantes:**

1. `ASAAS_PRODUCTION_API_KEY_BLOCKER` (externo / billing congelado)

## Billing

**FROZEN SAFE** — nenhuma alteração Asaas / billing.

## Próxima sprint

**34.5** — UX primeiro uso + mocks — **recomendado iniciar após este fechamento** (não iniciada automaticamente aqui).
