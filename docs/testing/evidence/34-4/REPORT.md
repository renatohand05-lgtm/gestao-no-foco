# Sprint 34.4 — Jornada de acesso (recuperar senha + convite + e-mail)

**Data:** 2026-08-14  
**Branch:** `main`  
**Commit:** `ba09b2e`  
**Tipo:** P1 acesso — sem billing / Asaas / Storage 34.3 / mobile / 34.5  
**34.3:** HOMOLOGADA (sem regressão intencional)

## Status

**SPRINT 34.4: GO (código READY; e-mail/redirects com pendências manuais documentadas)**

| Critério | Status |
|---|---|
| RECOVER PASSWORD | **PASS** |
| RESET PASSWORD | **PASS** (contrato + UI; e-mail depende Supabase Auth) |
| PASSWORD EMAIL | **MANUAL PENDING** (templates/redirect URLs no painel) |
| INVITE CREATE | **PASS** |
| INVITE EMAIL | **FALLBACK LINK** (sem envio automático) |
| INVITE ACCEPT | **PASS** |
| EXISTING USER | **PASS** (contrato) |
| NEW USER | **PASS** (login → aceite) |
| MULTIEMPRESA INVITE | **PASS** (nova membership no tenant B) |
| ROLE VALIDATION | **PASS** |
| PRIVILEGE ESCALATION | **PASS** |
| CROSS-TENANT | **PASS** |
| INACTIVE | **PASS** (reativação explícita no aceite) |
| REDIRECTS | **MANUAL PENDING** (allow-list Supabase) |
| P0 REGRESSION | **PASS** |
| Billing | **FROZEN SAFE** |

## Fluxo antigo (34.1)

1. Login → link ` /login?recuperar=1 ` **morto** (query ignorada).
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
| Password recovery | **Supabase Auth** (nativo) — depende SMTP/Auth do projeto |
| Convite equipe | **FALLBACK LINK** — sem Resend/SMTP send no código |
| `EMAIL_PROVIDER` / `RESEND_API_KEY` / `SMTP_HOST` | Detectados só para mensagem; **não enviam** |

## Rate limit

Supabase Auth aplica rate limit em `resetPasswordForEmail`. UI trata mensagem de limite. Sem infra adicional.

## Inactive / reinvite (regra real)

- Membro **ativo** com o e-mail: createInvite **bloqueia**.
- Membro **inactive**: createInvite **permite**.
- Aceite de convite legítimo: **reativa** membership (explícito no código/comentário). Não é reativação silenciosa fora do fluxo de convite.

## Redirects / Site URL (ação manual Renato)

No **Supabase Dashboard → Authentication → URL Configuration**:

1. **Site URL:** `https://gestao-no-foco.vercel.app`
2. **Redirect URLs** (adicionar se faltar):
   - `https://gestao-no-foco.vercel.app/api/auth/callback`
   - `https://gestao-no-foco.vercel.app/api/auth/callback?next=/nova-senha`
   - `https://gestao-no-foco.vercel.app/nova-senha`
   - (dev opcional) `http://localhost:3000/api/auth/callback**`

Templates (password recovery): CTA deve apontar para o link gerado pelo Auth (não hardcodar localhost). Customização visual **não** é requisito desta sprint.

**Não alterar Vercel envs** nesta sprint (APP_URL já documentado em `.env.example`).

## Migration

**NENHUMA** — `tenant_invitations` e auth existentes bastam.

## Testes

| Suite | Resultado |
|---|---|
| `test:phase34-4-access-journey` | **14 PASS** |
| `test:phase34-2-p0-tenant-rls` | **12 PASS** |
| `test:phase34-3-p1-mutation-auth` | **9 PASS** |
| `test:rbac` | **92 PASS** |
| lint | **PASS** (0 errors, 30 warnings pré-existentes) |
| typecheck (`tsc` via `next build`) | **PASS** |
| build | **PASS** (`/recuperar`, `/nova-senha` listados) |
| `git diff --check` | **PASS** |

## P1

**Fechados nesta sprint (código):**

1. Recuperar senha web  
2. Convite com fallback honesto de link  

**Restantes:**

1. `ASAAS_PRODUCTION_API_KEY_BLOCKER` (externo / billing congelado)  
2. Homologação manual: Redirect URLs + teste real de e-mail de recovery no Supabase  

## Billing

**FROZEN SAFE** — nenhuma alteração Asaas / billing.

## Próxima sprint

**34.5** — UX primeiro uso + mocks — **somente após homologação 34.4** (não iniciada aqui).
