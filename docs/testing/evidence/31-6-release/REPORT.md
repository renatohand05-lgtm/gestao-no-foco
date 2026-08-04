# Checkpoint 31.6-release — REPORT (pré-push)

## Classificação prevista

**SPRINTS 31.4 A 31.6 PUBLICADAS COM RESSALVAS** (device QA / EAS não aplicáveis)

## Gates (sessão release)

| Gate | Resultado |
|------|-----------|
| Expo Doctor | 20/20 |
| mobile lint/typecheck/test | PASS |
| homolog-31-4 | 9 PASS |
| homolog-31-5 | 8 PASS |
| homolog-31-6 | 11 PASS |
| dashboard/finance regression | PASS |
| lint | 0 errors (28 warnings pré-existentes) |
| test:rbac | 92 PASS |
| test:release-candidate | 65 PASS |
| build | PASS |

## Escopo versionado

CRM + hardening 31.4.1 + Estoque/Compras + Operação + deps Expo + scripts + docs evidence.

## Fora

EAS/loja/APK; SQL/migrations; alteração de regras web.

## Ressalvas

- Android/iOS device QA não executado
- Cold/Warm não medidos
