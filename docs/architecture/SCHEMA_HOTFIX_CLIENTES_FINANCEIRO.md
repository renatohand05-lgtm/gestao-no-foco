# Hotfix schema — Clientes + Rateio + Financeiro

## Causas raiz

| Erro | Causa |
| --- | --- |
| `Could not find the 'origem' column of 'clientes'` | Migration `20260719_master_data_foundation.sql` **não aplicada** (ou cache PostgREST stale) |
| `column contas_pagar_rateios_1.descricao does not exist` | Coluna `descricao` da Sprint 13.15.1 **ausente no remoto** — o select aninhado de `getById`/estorno falhava |

## Migration consolidada

Arquivo: `supabase/migrations/20260721_fix_clientes_financeiro_schema.sql`

### Execução manual

1. Abrir Supabase → **SQL Editor** → New query  
2. Colar o arquivo completo → **Run**  
3. Atualizar schema cache:
   - Opção A: o próprio SQL já executa `NOTIFY pgrst, 'reload schema';`
   - Opção B: Dashboard → **Project Settings → API → Reload schema**
4. Opcional: reiniciar `npm run dev`
5. Validar:
   - criar cliente com e sem origem
   - estornar conta paga **com e sem** rateio
   - excluir conta aberta

## Fallbacks no código (temporários)

- `ContaPagarService.getById` tenta select sem `descricao` / sem rateio se o remoto ainda não migrar  
- Insert de rateio sem `descricao` se a coluna faltar  
- DRE faz o mesmo fallback  
- **Não substituem** a migration; após o Run o caminho feliz usa o schema completo

## Confirmação SQL (opcional)

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'clientes'
  and column_name in ('origem', 'razao_social', 'segmento', 'porte');

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'contas_pagar_rateios'
  and column_name = 'descricao';
```
