# PHASE 28.9 — Types Final (release)

Atualizado: 2026-08-02 (fechamento oficial Fase 28)

## Geração oficial no release

Tentativas:

```bash
npx supabase gen types typescript --linked
npx supabase projects list
```

| Pré-requisito | Estado |
|---------------|--------|
| `SUPABASE_ACCESS_TOKEN` | **Ausente** (não solicitado / não versionado) |
| `supabase link` / project ref | **Ausente** |
| Docker / `--local` | **Ausente** |

**Resultado: NÃO regenerado.** Sem fingir sucesso. Nenhum token foi impresso, persistido ou commitado.

## Alternativa validada no release

```bash
node scripts/merge-phase28-database-types.mjs
```

Saída: todos os blocos Phase 28 já presentes (`SKIP` idempotente).

Cobertura confirmada em `types/database.ts`:

- `finance_budgets`
- `finance_budget_lines`
- `centros_resultado`
- `agenda_eventos`
- `agenda_recursos`
- `crm_oportunidades` (+ campos Phase 28)
- extensões `clientes` / `ordens_servico.tipo_ordem`

## Risco restante

| Item | Bloqueia release? |
|------|-------------------|
| Drift futuro vs dump remoto oficial | **Não** — dívida técnica não bloqueante |
| Casts `as never` CRM legado | Não |

## Dívida técnica (backlog)

Regenerar oficialmente com ambiente autenticado (`supabase login` ou token de CI) e diff contra `types/database.ts` na Fase 29.

## Decisão de release

Tipagem **não bloqueia** o release da Fase 28: build TypeScript OK, contratos `test:phase28-types-contract` OK, schema runtime homologado (28.7+), merge preservado.
