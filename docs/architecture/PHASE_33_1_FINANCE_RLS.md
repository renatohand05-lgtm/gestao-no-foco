# Sprint 33.1 — RLS write financeiro

**Status:** PRONTO PARA APLICAÇÃO MANUAL  
**Arquivo:** `supabase/migrations/20260822_phase33_1_finance_rls_write.sql`  
**Não usar `supabase db push` automático nesta sprint.**

## Impacto

| Antes | Depois |
|-------|--------|
| Qualquer `tenant_members` fazia INSERT/UPDATE/DELETE nas tabelas financeiras | SELECT: membro ativo do tenant · WRITE: `owner` \| `admin` \| `manager` ativos |
| `member` (visualização) podia escrever via PostgREST | `member` só lê |

Não inventa roles. Usa `tenant_members.role` real.

## Rollback

Recriar policies `FOR ALL` membership-only (não recomendado). Preferir corrigir a função `can_write_finance` se um papel legítimo ficar bloqueado.

## Aplicação (produção)

1. Snapshot no painel Supabase (ver `docs/pilot/PRODUCTION_RECOVERY.md`).
2. SQL Editor → colar o arquivo **inteiro** → Run.
3. Settings → API → Reload schema (ou `NOTIFY pgrst, 'reload schema';`).
4. Smoke: OWNER cria título; usuário `member` de teste **não** consegue INSERT.
