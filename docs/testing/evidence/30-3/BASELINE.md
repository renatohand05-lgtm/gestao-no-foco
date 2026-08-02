# Sprint 30.3 — Baseline

**Data:** 2026-08-02  
**HEAD:** `a109f32`  
**Branch:** `main` = `origin/main` (ahead 0 / behind 0)

## Git

| Item | Valor |
|------|--------|
| Working tree (código) | limpa |
| Untracked | apenas `docs/testing/evidence/27-8-*` (fora de escopo) |
| Merge / conflitos | nenhum |
| Diff staged | vazio |

## Pré-existência (não reescrever)

- `/onboarding` + `OnboardingForm` (cria tenant)
- `/{tenant}/primeiro-acesso` + wizard premium 4 passos (Gate 19.4)
- `user_onboarding_progress` (meta jsonb disponível)
- `config/segment-labels.ts` (nav multissetorial 30.1)
- Checklist data-backed em `lib/onboarding/onboarding-checklist.ts`

## Escopo 30.3

Onboarding enterprise multissetorial por **configuração** (segmentos, templates, checklist, import prep).  
Sem SQL remoto · sem commit · sem alterar DRE/CRM/estoque/compras/financeiro canônico.
