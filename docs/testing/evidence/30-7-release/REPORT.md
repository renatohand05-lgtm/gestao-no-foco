# Sprint 30.7.1 — Relatório Final · Homologação pós-migration

**Data:** 2026-08-03  
**Classificação:** **NÃO PUBLICADA**

---

## Bloqueio crítico

A API Supabase/PostgREST **não expõe** as tabelas `automation_*` no schema cache:

```
Could not find the table 'public.automation_rules' in the schema cache
```

Banner na Central (modo local seguro):

> Tabelas ausentes no schema cache da API (PGRST). No Supabase: Settings → API → Reload schema.

Sem reload do schema cache:

- persistência após refresh **não** funciona;
- requisito “schema pendente não aparece” **falha**;
- commit/push/deploy **interromidos** conforme regra da sprint.

Detalhe: `docs/testing/evidence/30-7-release/SCHEMA_VALIDATION.md`

---

## O que já está pronto no código (não publicado)

| Item | Status |
|------|--------|
| Repositório Supabase `lib/automacoes/repository.ts` | Pronto |
| Service dual (DB quando ready / memória fallback) | Pronto |
| UUID nativos para IDs persistidos | Pronto |
| CRUD QA3071-* + limpeza | Pronto |
| Probe com timeout + mensagem PGRST | Pronto |
| Migration no repo | `20260821_phase30_7_automations.sql` |
| Suites automation | 0 FAIL |
| phase29 / RC / rbac | 0 FAIL |
| build | PASS |
| lint | 0 errors (após prefer-const) |

---

## Homolog runtime

| Check | Resultado |
|-------|-----------|
| Rota `/automacoes` 200 | PASS |
| Cold (modo fallback) | ~661–1391 ms |
| Schema ready | **FAIL** (cache API) |
| Persistência pós-refresh | **não validável** |
| Browser QA 30.7.1 completo | **não aprovado** |

---

## Commit / push / deploy

| Etapa | Status |
|-------|--------|
| Commit | **NÃO** (bloqueio schema) |
| Push | **NÃO** |
| Deploy | **NÃO** |
| Smoke produção | **NÃO** |

---

## Ação imediata do operador

1. Supabase Dashboard → **Settings → API → Reload schema**
2. Confirmar tabelas no Table Editor
3. Rodar `npm run test:homolog-30-7-1` com `NEXT_PUBLIC_APP_URL` local
4. Se 0 FAIL → retomar commit/push desta sprint

---

## Checklist missão

| # | Item | Status |
|---|------|--------|
| 1 | CRM Premium em produção | **NÃO** (ainda não publicado) |
| 2 | Inteligência Executiva em produção | **NÃO** |
| 3 | Central de Automações em produção | **NÃO** |
| 4 | Ações externas continuam bloqueadas | **SIM** (código) |
| 5 | Pronto para Sprint 30.8 | **NÃO** (aguardar schema cache + release) |
