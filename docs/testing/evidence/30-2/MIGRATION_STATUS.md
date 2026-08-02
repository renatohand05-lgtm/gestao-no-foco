# Migration status — 30.2

| Item | Valor |
|------|-------|
| Arquivo | `supabase/migrations/20260820_phase30_2_team_rbac.sql` |
| Docs | `docs/architecture/PHASE_30_2_MIGRATIONS.md` |
| Execução remota nesta sessão | **NÃO** |
| Pronto para aplicação manual | **SIM** |
| Idempotente | SIM |
| DROP destrutivo | NÃO |
| Types | Atualizados manualmente em `types/database.ts` |

**QA local:** UI respondeu com convites/equipes (schema aparentemente já presente no Supabase do ambiente). Outros ambientes devem aplicar o arquivo manualmente e recarregar schema PostgREST.
