# Sprint 21.6 RC5 — Regeneração de types (pós-migration live)

## Status RC5

| Item | Estado |
|------|--------|
| Migrations 20260807_* aplicadas | Confirmado pelo operador |
| Migration 20260808_enterprise_rpc_grants_rc5.sql | **Aplicar manualmente** se audit mostrar RPC_GRANTS_SERVER = INVALID |
| `types/database.ts` — Functions enterprise_* | Parcialmente presente (RPCs) |
| `types/database.ts` — Tables enterprise | **Ausente** — regen necessária |
| `types/enterprise-database.ts` | Mantido até regen completa |
| `ENTERPRISE_TYPES_PENDING_REGEN` | `true` |

## Comando oficial

```bash
npx supabase login
npx supabase gen types typescript --project-id <PROJECT_REF> --schema public > types/database.ts.new
```

PowerShell:

```powershell
npx supabase gen types typescript --project-id <PROJECT_REF> --schema public | Set-Content -Encoding utf8 types/database.ts.new
```

## Procedimento seguro

1. Executar audit read-only — 21 tabelas FOUND.
2. Gerar `types/database.ts.new` (não sobrescrever direto).
3. Comparar Tables: `audit_events`, `enterprise_outbox`, `tenant_rbac_role_permissions`, etc.
4. Comparar Functions: assinaturas RC3/RC5 (`returns Json` nos save_*).
5. Mesclar: substituir `database.ts` somente se Tables + Functions completos.
6. Atualizar adapters para `client.from(...)` tipado.
7. Remover `enterprise-database.ts` se 100% substituído.
8. Setar `ENTERPRISE_TYPES_PENDING_REGEN = false`.
9. `npm run build` + suites Enterprise.

## Bloqueio RC5

Este agente **não executou** `gen types` porque:

- Não há `.env.local` / project ref no workspace
- Não expor secrets em relatório
- Regen exige autenticação CLI do operador

## Imports — estratégia única

- **Hoje:** `types/database-enterprise.ts` (fachada)
- **Pós-regen:** import direto de `types/database.ts` ou fachada mínima sem duplicar `Database`
