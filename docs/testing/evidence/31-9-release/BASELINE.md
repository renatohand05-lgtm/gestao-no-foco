# Checkpoint 31.9-release — BASELINE

**Data:** 2026-08-04
**Branch:** `main` (= `origin/main` em `f377f31`)
**Escopo:** Publicar Sprints 31.7 + 31.8 + 31.9 (código, APIs, docs, testes, Web Vercel).
**Fora de escopo:** EAS, APK/IPA, lojas, SQL remoto, migration, app mobile em store.

## Pré-checks

| Check | Resultado |
|-------|-----------|
| Branch | `main` |
| Sync origin | up to date com `origin/main` |
| Último checkpoint | `f377f31` (smoke 31.6) |
| Conflitos / merge / rebase | Não |
| Expo Doctor | **20/20** |
| Arquivos sensíveis (.env, keystore, service role) | Não observados no working tree |
| package-lock | Presente e modificado (deps mobile) |

## Working tree

Alterações locais intactas cobrindo:

- Sprint 31.7 — Inteligência (`inteligencia/`, `intelligence-compose`, homolog-31-7)
- Sprint 31.8 — Campo (`field-compose`, OS detalhe, checklist/anexos/assinatura)
- Sprint 31.9 — Produtividade (`productivity/`, search API, busca/comandos/scanner)

## Processos

Processos `node` ativos no host (IDE/tooling). Nenhum Metro/Expo identificado como preso para este checkpoint.

## Ressalvas conhecidas (pré-publicação)

- Android/iOS device QA não executado
- Scanner não validado em device
- Performance cold/warm não medida em device
- App não publicado em loja
