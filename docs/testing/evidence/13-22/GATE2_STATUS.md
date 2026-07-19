# Gate 2 — NF-e Importação 13.22

## Status

**BLOCKED** — aguardando aplicação manual da RPC `20260725_nfe_processar_rpc.sql` no Supabase e reexecução dos testes live.

## O que já foi feito (código)

1. `.env.example` — cercas Markdown removidas
2. Política de custo CTO — `lib/nfe/nfe-custo.ts` + `estoque-service` + documentação
3. `processImport` → RPC atômica `processar_nfe_entrada_atomico`
4. Migration incremental: `supabase/migrations/20260725_nfe_processar_rpc.sql` (**aplicar manualmente**)
5. Scripts: `audit:nfe`, `test:nfe-gate2`
6. `audit:schema --live` inclui tabelas NF-e + RPC

## Ação CTO / ops

No SQL Editor do Supabase, executar o arquivo:

`supabase/migrations/20260725_nfe_processar_rpc.sql`

Não reaplicar `20260725_nfe_entrada_importacao.sql` (já aplicada).

Depois:

```bash
npm run audit:nfe
npm run test:nfe-gate2
```

Esperado: `PASS=30 FAIL=0` e veredicto **READY**.
