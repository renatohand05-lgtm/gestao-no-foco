# Release Gate — Sprint 13.17

Enterprise Stability, Schema Sync & End-to-End Release Gate.

**Não iniciar Sprint 13.18 até auditoria formal do CTO.**

> Atualização: Sprint 13.18 iniciada a pedido explícito (Financial Intelligence) — camada somente leitura; Release Gate 13.17 permanece referência de estabilidade.

## Hotfix remoto (pré-condição)

Confirmar execução manual no Supabase SQL Editor (não assumir):

| Artefato | Status esperado |
|---|---|
| `20260721_fix_clientes_financeiro_schema.sql` | clientes.origem / razao_social / segmento / porte; rateios.descricao / deleted_at / updated_at; master data fornecedores/centros; eventos; tags; RLS; `NOTIFY pgrst` |
| `20260722_fix_recorrencia_schema.sql` | **Aplicada manualmente — confirmada 2026-07-15** |

Comando de sonda (somente leitura, não bloqueia build):

```bash
npm run audit:schema
npm run audit:schema -- --live
```

### Revalidação pós-20260722 (2026-07-15)

| Check | Resultado |
|---|---|
| `despesas_recorrentes.proxima_competencia` | OK |
| `despesas_recorrentes.ocorrencias_geradas` | OK |
| `despesas_recorrentes.pausada` | OK |
| `contas_pagar.despesa_recorrente_id` | OK |
| `npm run audit:schema -- --live` | **exit 0** |
| Schema drift crítico | **nenhum** |
| `npm run lint` | OK |
| `npm run build` | OK (exit 0) |
| `npm run dev` | Reiniciado — Ready |

Anti-duplicidade de recorrência (código): mesma série + `data_competencia` bloqueia regeneração mesmo se a ocorrência estiver cancelada ou soft-deleted (`despesa-recorrente-service.generateNextOccurrence`).

## Matriz de compatibilidade (resumo)

| Entidade | Campo usado no código | Campo esperado no banco | Migration | Status (probe live 13.17) |
|---|---|---|---|---|
| clientes | origem, segmento, porte, razao_social | idem | 20260719 / 20260721 | OK (após hotfix) |
| fornecedores | Master Data (categoria, plano, centro, forma, conta, recorrente…) | idem | 20260719 / 20260721 | OK |
| contas_pagar_rateios | descricao (opcional), deleted_at, updated_at | idem | 20260717 / 20260721 | OK |
| contas_pagar | despesa_recorrente_id | idem | 20260717 / **20260722** | **OK** |
| despesas_recorrentes | proxima_competencia, ocorrencias_geradas, pausada | idem | 20260717 / **20260722** | **OK** |
| financeiro_lancamento_eventos | action, motivo, payloads… | idem | 20260720 / 20260721 | OK |
| tags / entity_tags | slug, entity_type… | idem | 20260719 / 20260721 | OK |
| RPCs baixar/estornar | assinatura com parâmetros | idem | 20260709 | OK (arity ≠ ausência) |
| categorias / plano | dre_linha, dre_detalhe | idem | 20260717 / 20260718 | OK |

Catálogo completo: `lib/schema/schema-expectations.ts` + saída de `npm run audit:schema`.

## Problemas encontrados e causas raiz

1. **Schema cache / migrations manuais** — código esperava colunas não aplicadas → erro PostgREST em clientes e rateios (corrigido com 20260721).
2. **Recorrência incompleta no remoto** — partes de 20260717 não aplicadas → corrigido com **20260722 aplicada manualmente** (revalidado exit 0).
3. **Hydration** — `AlertDialogDescription` aninhando `<p>` / grids → ajustado em Confirm/Delete dialogs.
4. **Mensagens técnicas na UI** — server actions expunham `error.message` bruto → `toActionError` / `failAction`.

## Correções aplicadas nesta sprint

- Script `scripts/audit-schema-compatibility.mjs` + `npm run audit:schema`
- `lib/schema/schema-expectations.ts`
- `lib/supabase/friendly-error.ts` (+ wiring em clientes, produtos, master-data, financeiro)
- Migration incremental `20260722_fix_recorrencia_schema.sql` (manual)
- Diálogos Confirm/Delete (hydration) — sprints anteriores / gate
- Recuperação de `lib/financeiro/actions.ts` a partir do sourcemap Turbopack após restore acidental

## Instrução de implantação restante

1. Abrir Supabase SQL Editor.
2. Executar `supabase/migrations/20260722_fix_recorrencia_schema.sql`.
3. Confirmar `NOTIFY pgrst, 'reload schema';`
4. `npm run audit:schema -- --live` → exit 0.
5. Smoke autenticado nas rotas críticas (lista abaixo).

## Testes manuais restantes (checklist CTO)

- Clientes: PF/PJ, com/sem origem, dedupe CPF/CNPJ, soft delete, tenant
- Fornecedores: Master Data opcional + registros antigos
- Produtos/Serviços: SKU, barra, CMV, estoque
- CP/CR: editar aberta, soft delete, pagar/receber parcial, estorno, rateio, histórico
- Recorrência: só após 20260722
- DRE / Fluxo: competência vs caixa (sem alterar fórmulas)
- Busca global + Master Data: isolamento tenant
- RLS cruzado: negar leitura/escrita outro tenant

## Limitações

- Probe live usa ANON sem sessão: detecta coluna ausente; não valida RLS autenticado.
- Não há runner de testes E2E pesado nesta sprint.
- Fluxos autenticados de recorrência (criar/gerar/pausar/encerrar no browser) dependem de sessão do operador; contrato de anti-duplicidade está no serviço e as colunas necessárias estão no remoto.
- DRE/EBITDA/Fluxo formulas **não** foram alteradas (Design Freeze financeiro).

## Status final

**Sprint 13.17 pronta para aprovação do CTO** — schema remoto alinhado (`audit:schema --live` exit 0), lint/build verdes, sem nova migration necessária.
