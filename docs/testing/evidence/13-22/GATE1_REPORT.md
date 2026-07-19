# Sprint 13.22 Gate 1 — Relatório final

**Data:** 2026-07-19  
**Status:** código + migration + docs prontos para auditoria CTO  
**Não feito:** aplicar migration, importar nota real, commit, push, PR, Sprint 13.23

## Matriz (auditoria)

| Entidade necessária | Estrutura existente | Reutilizar | Alteração necessária |
|---------------------|---------------------|------------|----------------------|
| Fornecedor | `fornecedores` | Sim | Match `documento` |
| Produto | `produtos` | Sim | EAN→`codigo_barras` |
| Estoque | `estoque_movimentacoes` | Sim | entrada `origem=compra`; sem update de custo |
| OS item | `ordem_servico_itens` | Sim | `peca_origem=compra` |
| Conta a Pagar | `contas_pagar` | Sim | opcional + parcelamento |
| Classificadores | plano/categoria/centro | Sim | se gerar CP |
| Storage | padrão inspeção | Padrão | bucket `nfe-entrada` |
| NF-e domínio | — | Não | 4 tabelas + RLS |

## Tabelas / constraints / RLS

Migration: `supabase/migrations/20260725_nfe_entrada_importacao.sql`

- `notas_fiscais_entrada` — unique ativa chave + xml_hash
- `notas_fiscais_entrada_itens` — destinos estoque/os/misto/despesa/ignorar
- `notas_fiscais_entrada_eventos`
- `fornecedor_produto_vinculos`
- RLS por `tenant_members` + storage policies

## Custo (pendência CTO)

Entrada **não** atualiza `produtos.custo`. Conferência mostra impacto estimado.  
Decisão necessária: último custo vs médio ponderado.

## Fluxo / parser / segurança

- Parser XXE-safe (`fast-xml-parser`, DOCTYPE/ENTITY rejeitados)
- Matching: CNPJ exact; produto EAN/vínculo/SKU (descrição só sugestão)
- Destinos: estoque / OS / misto (1 OS por item no Gate 1)
- CP opcional, aberta, sem banco
- Idempotência por chave/hash + IDs de mov/OS item

## Arquivos

**Criados:** migration, `lib/nfe/*`, `types/nfe-entrada.ts`, `components/nfe/*`, rotas `estoque/notas-fiscais/**`, docs Gate2/checklist/arquitetura, `scripts/nfe-parser-tests.mjs`

**Alterados:** `app/.../estoque/page.tsx` (atalho), `package.json` (+fast-xml-parser, test script)

## Testes executados

| Suite | Resultado |
|-------|-----------|
| `npm run test:nfe-parser` | PASS=9 FAIL=0 |
| `npm run lint` | EXIT 0 |
| `npm run build` (`.next-build`) | EXIT 0 |

Live import / 30 testes completos = **Gate 2** após migration.

## Riscos / pendências

1. Política de custo do produto (bloqueia update automático)
2. Atomicidade plena via RPC (hoje: status+compensação parcial)
3. Múltiplas OS por item (documentado como evolução)
4. Tables tipadas com `as never` até regenerar `database.ts` pós-migration
5. `addItem` exige status de OS editável — OS muito precoce pode falhar

## Instrução Gate 2

Seguir `docs/architecture/GATE2_NFE_IMPORTACAO_13_22.md`: aplicar SQL manualmente → smoke → checklist `docs/testing/NFE_IMPORTACAO_30_TESTES_13_22.md`.

**PARE. Aguardando auditoria formal do CTO.**
