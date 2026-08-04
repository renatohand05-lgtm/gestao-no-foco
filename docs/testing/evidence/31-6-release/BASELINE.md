# Checkpoint 31.6-release — BASELINE

**Data:** 2026-08-04
**Branch:** `main` (= `origin/main` em `cec3e22`)
**Missão:** Publicar Sprints 31.4, 31.4.1, 31.5 e 31.6 (sem EAS/loja).

## Estado pré-commit

| Check | Resultado |
|-------|-----------|
| Merge/rebase | Não |
| Ahead/behind origin | 0 / 0 |
| Arquivos sensíveis no tree | Não observados (.env, keystore, tokens) |
| Trabalho local | CRM + Estoque + Operação + deps Expo + scripts + docs |

## Escopo a versionar

- APIs mobile: `/crm/*`, `/estoque/*`, `/operacao/*`
- Apps Expo: tabs CRM, Estoque, Operação
- Compose/auth: `lib/mobile/{crm,stock,operations}-*`
- Scripts homolog 31-4/5/6 + suites phase31
- Docs architecture + evidence 31-4 … 31-6
- `package.json` / `package-lock.json` / `apps/mobile/package.json` (Doctor 20/20)

## Fora de escopo

EAS Build/Submit, APK, lojas, SQL remoto, migrations, features novas, alteração de regras web.
