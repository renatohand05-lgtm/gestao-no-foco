# PHASE 28 — Types Audit (Sprint 28.8)

Data: 2026-08-01  
Escopo: tipagem Supabase vs schema Fase 28 real.

## Geração oficial

Comando tentado:

```bash
npx supabase gen types typescript --local
```

**Resultado: FALHOU (não fingido).**

| Tentativa | Resultado |
|-----------|-----------|
| `supabase gen types typescript --local` | Erro: Docker/Podman ausente (`LegacyContainerRuntimeNotFoundError`) |
| `SUPABASE_ACCESS_TOKEN` | **Ausente** no ambiente |
| Geração remota via CLI com project-ref | Não executada (sem token) |

**Conclusão:** types oficiais do projeto remoto **não** foram regenerados nesta sessão.

## Fonte atual de verdade tipada

| Artefato | Papel |
|----------|--------|
| `types/database.ts` | Database tipado consumido pelo app |
| `scripts/merge-phase28-database-types.mjs` | Merge idempotente Phase 28 (quando gen oficial indisponível) |
| Migrations `20260802_phase28_*.sql` | Schema SQL canônico |
| Probe 28.7 `homolog-28-7-schema.mjs` | Validação runtime de colunas/tabelas |

## Tabelas Phase 28 cobertas em `types/database.ts`

Confirmadas por grep / merge:

- `agenda_eventos` (+ recursos / colunas Phase 28)
- `centros_resultado`
- `finance_budgets`
- `crm_oportunidades` (campos Phase 28: centro_custo, etc.)
- Extensões em `clientes` (prioridade_crm, valor_potencial, proxima_acao, …)
- Campos OT / `tipo_ordem` conforme merge

## Tabelas / áreas ausentes ou só parciais

| Item | Situação | Risco |
|------|----------|-------|
| Regeneração full dump | Não feita | Médio — drift futuro se schema remoto mudar sem merge |
| Views/RPCs Phase 28 | Poucas tipadas se existirem só no SQL remoto | Baixo se app não as usa |
| Enums Postgres novos | Podem aparecer como `string` no merge | Baixo |

## Colunas divergentes conhecidas (histórico)

- Agenda: colunas canônicas **`inicio` / `fim`** (não `data_inicio` / `data_fim`). Bug de fallback corrigido na UI `/agenda` (28.8).
- CRM: deals = `crm_oportunidades`; leads = `clientes.estagio_funil=lead` — tipagem alinhada a essa dualidade.

## Casts temporários / `as never`

Ainda existem `as never` em services CRM legados (`crm-funnel-service`, timeline) por padrões pré-Phase 28. Remoção ampla **não** feita sem gen oficial completo (risco de regressão de tipagem).

Casts removidos onde merge 28.7 já cobria (parcial, 28.7).

## Types manuais

- Contratos de domínio em `lib/crm/phase28/*`, `lib/finance/budget/*`, `lib/agenda/*` — **manuais por desenho**, não substituem `Database`.
- `ConversionResult` em `conversion.ts` — contrato de status explícito (não mock de sucesso).

## Risco atual

| Dimensão | Nota |
|----------|------|
| Cobertura Phase 28 nas tabelas críticas | Alta (merge + probe runtime) |
| Paridade com `supabase gen types` remoto | **Incompleta** até token/Docker |
| Risco de produção por tipagem | Médio-baixo se migrations aplicadas e probe 28.7 PASS |
| Ação recomendada pré-Fase 29 | Rodar `supabase gen types` com token e diff contra `types/database.ts` |

## Decisão 28.8

- **Não** editar `types/database.ts` de forma arbitrária.
- Preservar merge atual.
- Documentar limitação honestamente.
- Corrigir apenas divergências comprovadas em runtime (ex.: agenda `inicio`/`fim`).
