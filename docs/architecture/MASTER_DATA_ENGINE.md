# Master Data Engine (Sprint 13.16)

Fundação central de cadastros mestres do Gestão no Foco. Objetivo: reduzir duplicidades, padronizar dados, sugerir classificação determinística e alimentar busca/cache isolados por tenant — **sem** alterar DRE, Fluxo de Caixa, KPIs ou Design Freeze do Dashboard Executivo.

## Arquitetura

Camada `lib/master-data/`:

| Arquivo | Responsabilidade |
| --- | --- |
| `master-data-types.ts` | Tipos tipados (hits, sugestões, tags, dedupe) |
| `master-data-service.ts` | Fachada (search, autofill, listas cacheadas) |
| `master-data-repository.ts` | Tags / entity_tags |
| `master-data-validation.ts` | Normalização e documento |
| `master-data-mappers.ts` | Helpers de mapeamento |
| `master-data-suggestions.ts` | Sugestões determinísticas + merge sem sobrescrever |
| `master-data-search.ts` | Busca global tipada |
| `master-data-cache.ts` | Cache in-memory por tenant + bucket |
| `master-data-deduplication.ts` | Detecção (sem merge destrutivo) |
| `master-data-import-types.ts` | Contratos futuros de importação (sem UI) |
| `actions.ts` | Server actions (tenant via `requireTenant`) |
| `index.ts` | API pública |

Regras:

- Componentes React **não** acessam o banco diretamente.
- Tenant sempre resolvido no servidor (`requireTenant`).
- Sem IA externa.

## Entidades

| Entidade | Origem | Notas 13.16 |
| --- | --- | --- |
| Fornecedor | `fornecedores` | CRUD completo + defaults financeiros |
| Cliente | `clientes` | Campos leves + dedupe |
| Produto/serviço | `produtos` | SKU único já existente; barcode opcional para serviço |
| Categoria financeira | `categorias_financeiras` | Hierarquia DRE 13.15.x preservada |
| Plano de contas | `plano_contas` | Classificação econômica intacta |
| Centro de custo | `centros_custo` | Campos tipo/departamento/unidade/filial |
| Formas / contas | existentes | Cache de opções |
| Tags | `tags` + `entity_tags` | Reutilizáveis por entidade |

## Relacionamentos (fornecedor → classificação)

Fornecedor pode carregar defaults:

- `categoria_financeira_id`
- `plano_conta_id`
- `centro_custo_id`
- `forma_pagamento_id`
- `conta_bancaria_id`
- recorrência / frequência / prazo

A linha DRE é **derivada** da categoria ou plano (não inventada no cadastro do fornecedor).

## Sugestões e autopreenchimento

`suggestContaPagarFromFornecedor` + `mergeAutofillWithoutOverwrite`:

1. Confiança **high** quando há defaults no cadastro → preenche apenas campos vazios em Contas a Pagar.
2. Confiança **low** (ex.: nome sugere utilidade sem defaults) → apenas hint; **não** aplica IDs.
3. Nunca sobrescreve valor já informado.
4. Usuário pode alterar a qualquer momento.
5. Não reclassifica lançamentos anteriores.

UI: banner visível no formulário de Contas a Pagar ao selecionar fornecedor.

## Deduplicação

Critérios (por tenant):

- Fornecedor: documento, nome, fantasia, e-mail
- Cliente: documento, e-mail, telefone
- Produto: SKU, código de barras, nome+categoria

Comportamento: **alerta / bloqueio no save**. Sem união automática. Tipo `FutureMergePlan` prepara merge futuro.

Documento (CPF/CNPJ) e SKU também têm unique indexes no banco quando informados.

## Busca global

- Rota: `/{tenant}/busca`
- Action: `masterDataSearchAction`
- Isolamento: `tenant_id` + soft delete
- Debounce ~280ms, limite por tipo, origem tipada, teclado (↑↓ Enter)

Command Bar do Workspace Executivo **não** foi redesenhado (Design Freeze).

## Cache

`master-data-cache.ts`:

- Chave por `tenantId` + bucket (categorias, planos, centros, fornecedores ativos, tags)
- Invalidação em create/update/delete de fornecedor (e tags)
- Sem cache global compartilhado entre tenants
- Sem polling

## Segurança / RLS

- Policies de membro do tenant em `tags` e `entity_tags`
- Services filtram `tenant_id` + `deleted_at is null`
- Tenant **não** confiado do client; vem de `requireTenant`
- Sem sugestão / busca / cache cruzando tenants

## Importação futura

`master-data-import-types.ts` define entidades, campos, formato CSV/JSON, erros por linha, preview e duplicidades. **Sem tela e sem processamento de arquivo nesta sprint.**

## Migrations (manual)

Arquivo: `supabase/migrations/20260719_master_data_foundation.sql`

**Não executar automaticamente em produção.** Colar no Supabase SQL Editor:

1. Abra o projeto no Supabase
2. SQL Editor → New query
3. Cole o conteúdo do arquivo
4. Run
5. Confirme colunas novas em `fornecedores`, `clientes`, `centros_custo` e tabelas `tags` / `entity_tags`

Não altera migrations antigas nem dados existentes.

## Limitações desta sprint

- Tags: persistência pronta; UI de atribuição ainda mínima
- Importação em massa: só tipos
- Merge de duplicatas: não implementado
- Command Bar executivo: mantido como estava
- Campos DRE “grupo/subgrupo/linha” no fornecedor são derivados da classificação, não duplicados como fonte

## O que NÃO foi alterado

- Cálculos do DRE / composição do EBITDA
- Regras do Fluxo de Caixa
- KPIs, BI, EI, Prediction, Timeline, Copilot, Action Center/Plan
- Dashboard Executivo / Design Freeze / Layout & Workspace Engine
- APIs existentes (facade aditiva)

## Rotas novas

- `/{tenant}/financeiro/fornecedores`
- `/{tenant}/financeiro/fornecedores/novo`
- `/{tenant}/financeiro/fornecedores/[id]`
- `/{tenant}/financeiro/fornecedores/[id]/editar`
- `/{tenant}/busca`
