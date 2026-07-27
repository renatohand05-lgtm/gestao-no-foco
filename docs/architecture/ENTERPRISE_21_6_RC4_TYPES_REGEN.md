# Sprint 21.6 RC4 — Regeneração de types (pós-migration)

## Quando executar

Somente depois do **audit read-only** confirmar que as 21 tabelas Enterprise existem
e as RPCs `enterprise_*` estão corretas.

## Comando oficial (não executar sem project ref + login CLI)

```bash
# 1) Confirmar project ref do ambiente (NÃO assumir produção às cegas)
#    Dashboard → Project Settings → General → Reference ID

# 2) Login (se necessário)
npx supabase login

# 3) Regenerar types oficiais
npx supabase gen types typescript --project-id <PROJECT_REF> --schema public > types/database.ts
```

PowerShell (evitar truncar encoding):

```powershell
npx supabase gen types typescript --project-id <PROJECT_REF> --schema public | Set-Content -Encoding utf8 types/database.ts
```

## Após regenerar

1. Comparar Tables Enterprise com `types/enterprise-database.ts`
2. Confirmar Functions `enterprise_*` (incl. `p_processor_id`, save_* → Json)
3. Se Tables estiverem no oficial:
   - atualizar adapters para `client.from(...)` tipado onde seguro
   - remover aliases temporários / `ENTERPRISE_TYPES_PENDING_REGEN`
   - imports via `types/database-enterprise.ts` ou direto `database.ts`
4. `npx tsc --noEmit` (ou `npm run build`)
5. Suites Enterprise

## O que este agente NÃO fez automaticamente

- Não leu `.env.local` / service role
- Não chamou `gen types` (faltou confirmação explícita de project ref + auth CLI neste fluxo)
- Manter `ENTERPRISE_TYPES_PENDING_REGEN = true` até regen bem-sucedida
