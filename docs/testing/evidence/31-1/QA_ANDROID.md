# Sprint 31.1 — QA Android

| Cenário | Resultado |
|---------|----------|
| Suites estáticas / contratos | PASS (210) |
| Expo Doctor | 20/20 |
| Emulador Android | Não executado nesta sessão |
| Device físico | Não executado |
| Login real E2E | Requer `.env` + Next API + Supabase |

## Como homologar localmente

1. Configurar `apps/mobile/.env` (URL/anon + API base)
2. `npm run dev` (web API)
3. `npm run mobile:android` ou Expo Go / dev client
4. Validar login, tenant, branch continue, biometria, offline, logout

**Classificação Android:** PARCIAL
