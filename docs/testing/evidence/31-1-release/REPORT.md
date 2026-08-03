# Fase 31 — Mobile Foundation & Auth — Release Report

**Data:** 2026-08-03
**Classificação:** **PUBLICADAS COM RESSALVAS**

## Escopo versionado

Sprints **31.0** (foundation) + **31.0.1** (monorepo hardening) + **31.1** (auth enterprise) + **31.1.1** (homologação / checkpoint).

## Redirect URLs (manual)

| URL | Status app | Ação humana |
|-----|------------|-------------|
| `gof://auth/reset` | Implementada | Adicionar em Supabase Redirect URLs |
| `gof://auth/callback` | Implementada | Adicionar em Supabase Redirect URLs |
| `gof://auth/recovery` | Não implementada | Não configurar |
| `gof://auth/invite` | Não implementada | Não configurar |

Doc: `docs/architecture/MOBILE_SUPABASE_REDIRECT_URLS.md`

## Recovery

**PARCIAL** — contratos e UI OK; E2E depende de Redirect URLs no Supabase + device Android.

## Android environment / QA

**Nenhum ambiente Android disponível** nesta máquina (sem SDK/adb/emulador/device).
Homologação Android: **NÃO**. Evidência: `docs/testing/evidence/31-1-1/ANDROID_*.md`

## Biometria / Offline / iOS

| Área | Resultado |
|------|-----------|
| Biometria | PARCIAL (código + testes; sem device) |
| Offline limitado | Código SIM; device NÃO |
| iOS | Config pronta; não buildado/instalado/homologado |

## Web preservada

| Gate local | Resultado |
|------------|-----------|
| lint | PASS (0 errors) |
| build | PASS |
| RC | 65 PASS |
| rbac | 92 PASS |
| Expo Doctor | 20/20 |

Import boundaries: packages sem RN/Expo; mobile isolado em `apps/mobile`.

## Commit / push / Vercel

| Item | Valor |
|------|-------|
| Commit | `b790029` — `feat(mobile): concluir fundacao e autenticacao Enterprise da Fase 31` |
| Push `origin/main` | SIM (`e765e52..b790029`) |
| Vercel Production | **success** — [deployment](https://vercel.com/renato16/gestao-no-foco/3cBJzUopnJXXCH4zCHkZv8PZM6Jg) |
| Alias | https://gestao-no-foco.vercel.app |
| Smoke web | `/` 200, `/login` 200, `/api/health` 200, `/demo` 307, `/onboarding` 307 — sem 404/500 nos checks |

App mobile **não** publicado em stores; sem EAS Submit.

## Bugs

- Bloqueante novo: nenhum no código/gates
- Não bloqueante: Android QA ausente; recovery E2E pendente; filiais fallback

## Pendências

**Bloqueantes para “Android homologado”:** instalar SDK + device/AVD + rodar checklist.
**Não bloqueantes para 31.2:** iOS device QA; filiais reais; screenshots device; configurar Redirect URLs no Supabase.

## Checklist final

1. Android homologado: **NÃO**
2. recovery homologado: **PARCIAL**
3. biometria homologada: **PARCIAL**
4. iOS preparado: **PARCIAL**
5. fundação mobile versionada: **SIM** (`b790029`)
6. web preservada em produção: **SIM** (Vercel success + smoke 200)
7. pronto para Sprint 31.2: **SIM**
