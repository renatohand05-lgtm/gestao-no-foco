# Sprint 30.7.1 — Validação de schema pós-migration

**Data:** 2026-08-03  
**Tenant QA:** `teste-renato-01`

## Resultado da API (PostgREST)

Leitura autenticada retornou:

```
Could not find the table 'public.automation_rules' in the schema cache
```

Isso indica que:

1. A migration pode ter sido aplicada no banco; **porém**
2. O **schema cache** da API Supabase/PostgREST ainda não expõe as tabelas `automation_*`.

Sem reload do cache, a Central opera em **modo local seguro** (memória) e **não persiste** após refresh — requisito bloqueante da 30.7.1.

## Ação necessária (sem SQL remoto)

No painel Supabase do projeto:

1. **Settings → API → Reload schema** (ou equivalente “Refresh schema cache”)
2. Confirmar que as tabelas aparecem no Table Editor:
   - `automation_rules`
   - `automation_executions`
   - `automation_approvals`
   - `automation_templates`
   - `automation_audit`
   - `automation_internal_notifications`
3. Reexecutar: `npm run test:homolog-30-7-1`

## Critério para continuar commit/push

- Banner `data-automacoes-schema-ready` presente
- Banner pendente ausente
- Regra QA3071-* sobrevive a refresh
- Browser QA 30.7.1 com **0 FAIL**

## Nota

Não executar `NOTIFY pgrst` / SQL remoto nesta sprint. Reload via UI do Supabase.
