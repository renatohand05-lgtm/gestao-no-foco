# Sprint 31.1 — Baseline Mobile Auth Enterprise

**Data:** 2026-08-03
**Branch:** main (= origin/main)
**Expo Doctor:** 20/20
**Pré-requisito:** 31.0 + 31.0.1 locais (workspaces) preservados

## Achados

| Item | Estado |
|------|--------|
| Login web | Supabase `signInWithPassword` (anon) |
| Password recovery web | **Ausente** — será criado no mobile + API |
| Memberships | `tenant_members` + `tenants` via `lib/tenants.ts` |
| Filiais table | **Inexistente** — seletor com fallback “Matriz / sem filial” |
| Mobile auth | Mock SecureStore |
| API mobile | Inexistente |

## Decisão

Híbrido:
1. Auth tokens via Supabase JS + SecureStore (anon key pública)
2. Memberships / permissions / branches via `app/api/mobile/v1/*` com Bearer
3. Sem service role no mobile
4. Sem migration remota nesta sprint
