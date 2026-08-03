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

Preenchido após publicação:

| Item | Valor |
|------|-------|
| Commit | _(pendente)_ |
| Push `origin/main` | _(pendente)_ |
| Vercel Production | _(pendente)_ |
| Smoke web | _(pendente)_ |

## Bugs

- Bloqueante novo: nenhum no código/gates
- Não bloqueante: Android QA ausente; recovery E2E pendente; filiais fallback

## Pendências

**Bloqueantes para “Android homologado”:** instalar SDK + device/AVD + rodar checklist.
**Não bloqueantes para 31.2:** iOS device QA; filiais reais; screenshots device.

## Checklist final

1. Android homologado: **NÃO**
2. recovery homologado: **PARCIAL**
3. biometria homologada: **PARCIAL**
4. iOS preparado: **PARCIAL**
5. fundação mobile versionada: _(atualizar pós-commit)_
6. web preservada em produção: _(atualizar pós-deploy)_
7. pronto para Sprint 31.2: **SIM**
