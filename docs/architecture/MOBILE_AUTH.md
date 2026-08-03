# Mobile Auth Foundation

## Estados

`booting` → `unauthenticated` → `authenticating` → `authenticated_without_tenant` → `authenticated`
também: `refreshing`, `expired`, `offline_limited`, `error`

## Armazenamento

- Tokens apenas em **Expo SecureStore** (`src/auth/secure-session.ts`)
- Prefixo mock: `mock.access.*` (31.0 — sem Auth real)
- Nunca AsyncStorage para token
- Nunca logar token / URL / screenshot de segredo

## Fluxo 31.0

1. Splash/boot lê SecureStore
2. Login mock (email/senha não vazios)
3. Seleção de tenant → filial
4. App shell autenticado
5. Logout limpa SecureStore + stores + QueryClient

## Futuro (31.1+)

- Refresh real via API gateway
- MFA / biometria (adapters preparados)
- Deep link auth
- Offline limitado com sessão prévia válida + cache cifrado
