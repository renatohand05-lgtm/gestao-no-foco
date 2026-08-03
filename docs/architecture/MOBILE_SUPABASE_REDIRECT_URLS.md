# Mobile Supabase Redirect URLs

Documento operacional da Sprint **31.1.1**.
O Agent **não** altera o projeto Supabase remotamente — configuração manual no Dashboard.

## Scheme do app

- **Scheme:** `gof` (`apps/mobile/app.config.ts`)
- **Package / Bundle:** `com.gestaonofoco.app`
- Expo Router + `expo-linking` tratam URLs com esse scheme.

## URLs reais no código (allowlist)

Somente estas URLs estão implementadas. **Não** inventar paths extras no Supabase sem código correspondente.

| URL | Finalidade | Onde no app | Ambientes |
|-----|------------|-------------|-----------|
| `gof://auth/reset` | Callback de recuperação de senha (`resetPasswordForEmail` → `redirectTo`) | `recover.tsx` → deep link → `/(auth)/reset` | development, preview, production |
| `gof://auth/callback` | Callback genérico de auth (tratado no `_layout`; roteia para fluxo de reset/auth interno) | `app/_layout.tsx` `handleAuthDeepLink` | development, preview, production |

### Paths mencionados em briefings, **ainda sem implementação dedicada**

| URL | Status |
|-----|--------|
| `gof://auth/recovery` | **Não** usada no código — não configurar até implementar |
| `gof://auth/invite` | **Não** usada no código — não configurar até implementar |

## Onde configurar no Supabase

1. Abrir [Supabase Dashboard](https://supabase.com/dashboard) → projeto → **Authentication** → **URL Configuration**
2. Em **Redirect URLs**, adicionar exatamente:
   - `gof://auth/reset`
   - `gof://auth/callback`
3. **Site URL** pode permanecer a URL web de produção; deep links mobile entram na allowlist de Redirect URLs.
4. Em **Email Templates** (Reset password), o link deve respeitar o `redirect_to` enviado pelo client (`gof://auth/reset`).

Repetir a allowlist em cada projeto Supabase (dev / staging / prod) se houver projetos separados.

## Segurança

| Risco | Mitigação no app |
|-------|------------------|
| Open redirect | Handler só aceita paths `auth/reset` e `auth/callback` no scheme `gof`; não abre `http(s)` arbitrário |
| Host não autorizado | Scheme customizado; sem associated domains nesta sprint |
| Token em log | Contratos/testes proíbem log de tokens; reset parseia hash/query sem logar |
| Replay | Sessão de recovery é one-shot via `updateUser` + fluxo de nova senha; token não deve ser reusado após conclusão |
| Navegação sem guard | Deep link cai em `/(auth)/reset`; shell autenticado continua sujeito a guards de tenant/branch/RBAC |

## Teste esperado (após configurar no Dashboard)

1. App: Recuperar senha → e-mail → mensagem neutra de envio
2. Abrir link do e-mail → OS abre app via `gof://auth/reset`
3. Tela de nova senha → sucesso → login
4. Reabrir o mesmo link → falha amigável (token inválido/expirado)
5. E-mail inexistente → mesma mensagem neutra (sem enumeração)

## Limitação 31.1.1

Sem Android SDK/device nesta máquina e sem alteração remota do Supabase pelo Agent, a **homologação E2E de recovery fica PARCIAL** (contratos + código + checklist manual).
