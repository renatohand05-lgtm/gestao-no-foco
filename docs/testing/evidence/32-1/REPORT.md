# Sprint 32.1 — Publicar Build 114 no TestFlight

**Data/hora:** 2026-08-09 ~14:05 UTC−3  
**Branch:** `main`  
**HEAD:** `b03121c` (eas.json `distribution: store`)  
**origin/main:** sincronizado  

## Classificação final

**BLOQUEADO** — aguardando autenticação Apple interativa para credenciais **App Store** (não Ad Hoc).

Não é bloqueio de código/produto: gates e profile production estão prontos.

---

## Checklist obrigatório

| # | Item | Resultado |
|---|------|-----------|
| 1 | Fase 31 encerrada | **SIM** (`docs/testing/evidence/31-11-15/REPORT.md`) |
| 2 | Release candidate original | Build **114** preview (`7165e858-ae78-4030-8f30-3d0b2087c369`) |
| 3 | Build 114 poderia ser enviada diretamente | **NÃO** — `distribution: INTERNAL`, profile `preview` |
| 4 | Production build necessária | **SIM** |
| 5 | Version | **1.10.0** |
| 6 | Production build number | **115** reservado pelo EAS remote no attempt (build não concluída); próximo attempt deve confirmar number |
| 7 | EAS Build ID | **N/A** (falhou antes do upload completo / credentials) |
| 8 | Build URL | **N/A** |
| 9 | Environment production | **SIM** (EAS env + `EXPO_PUBLIC_APP_ENV=production`) |
| 10 | distribution store | **SIM** (eas.json production atualizado em `b03121c`) |
| 11 | Bundle ID correto | **SIM** `com.gestaonofoco.app` |
| 12 | Expo project correto | **SIM** `@gesto-no-foco/gestao-no-foco` / `51b0c195-…` |
| 13 | Doctor 20/20 | **SIM** |
| 14 | lint PASS | **SIM** |
| 15 | typecheck PASS | **SIM** |
| 16 | tests PASS | **SIM** (29/0) |
| 17 | export iOS PASS | **SIM** (~5.8 MB) |
| 18 | main == origin/main | **SIM** |
| 19 | App Store Connect app | **Não confirmado nesta sessão** (requer login Apple / ASC API) |
| 20 | Submission executado | **NÃO** |
| 21 | Submission ID | **N/A** |
| 22 | Apple processing | **N/A** |
| 23 | Build disponível no TestFlight | **NÃO** |
| 24 | Teste interno configurado | **NÃO** |
| 25 | Teste externo configurado | **NÃO** |
| 26 | Enviado para App Store Review | **NÃO** |
| 27 | Pendências humanas/compliance | Login Apple interativo para gerar **App Store provisioning**; confirmar/criar app ASC com bundle `com.gestaonofoco.app`; encryption já `ITSAppUsesNonExemptEncryption=false` |
| 28 | blockers restantes | Credenciais iOS **store** ausentes no EAS remote (só Ad Hoc das builds preview) |
| 29 | PRONTO PARA TESTE INTERNO TESTFLIGHT | **NÃO** |

---

## Evidência técnica

### Build 114 (não elegível)

```json
{
  "profile": "preview",
  "distribution": "INTERNAL",
  "channel": "preview",
  "appVersion": "1.10.0",
  "appBuildVersion": "114"
}
```

### Env production (EAS) — valores públicos / presença

| Variável | Status |
|----------|--------|
| `EXPO_PUBLIC_API_BASE_URL` | `https://gestao-no-foco.vercel.app` |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://phjskpyuqlijvbgjdkss.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | presente (sensitive) |
| `EXPO_PUBLIC_APP_ENV` | `production` via profile |

### Attempt production build

```
Resolved "production" environment
Incremented buildNumber from 114 to 115
Using remote iOS credentials
Failed to set up credentials.
Credentials are not set up. Run this command again in interactive mode.
```

Team esperado: **RENATO FRANCO** / `J8LV256YUP`.

---

## Procedimento humano para desbloquear (sem mudar código)

Em um terminal **interativo** (local do responsável Apple):

```powershell
cd apps\mobile

# 1) Gerar/sincronizar App Store Distribution + provisioning
npx eas-cli@latest credentials:configure-build -p ios -e production
# → logar Apple ID do time J8LV256YUP
# → reutilizar Distribution Certificate existente
# → deixar EAS criar/atualizar App Store provisioning para com.gestaonofoco.app

# 2) Build store
npx eas-cli@latest build --platform ios --profile production --clear-cache

# 3) Após ✔ Build finished
npx eas-cli@latest submit --platform ios --latest --profile production
```

Depois no App Store Connect:

1. Aguardar processamento da build.
2. TestFlight → teste **interno** apenas.
3. **Não** enviar para App Review / App Store pública nesta sprint.

Opcional (CI futuro): cadastrar **App Store Connect API Key** no EAS para builds/submits non-interactive.

---

## Alterações de código nesta sprint

| Arquivo | Motivo |
|---------|--------|
| `apps/mobile/eas.json` | `production.distribution = "store"` explícito |
| `docs/testing/evidence/32-1/REPORT.md` | evidência |

Sem alteração de RBAC, API, Supabase, projectId ou bundleId.
