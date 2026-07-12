# Backlog Técnico — Gestão no Foco

Documento de melhorias futuras do módulo financeiro e integrações relacionadas.  
**Não representa pendências bloqueantes** dos sprints concluídos — são evoluções planejadas.

Última atualização: fechamento Sprint 8.6 (DRE Real).

---

## Sprint 8.6 — Concluído

DRE Real por competência entregue (leitura 100% banco, sem mock).

**Pendências do Sprint 8.6:** nenhuma bloqueante.

### Movido do 8.6 para backlog

| Item | Descrição | Prioridade |
|------|-----------|------------|
| `data_competencia` / `plano_conta_id` em Contas a Receber | Paridade com CP para competência e plano diretos | Alta |
| Tipo `custo` em categorias/plano | Separar CMV/custos de despesas operacionais na classificação | Média |
| Depreciação/amortização no EBITDA | EBITDA contábil real | Baixa |
| Dashboard financeiro | Indicadores gerenciais além do DRE | Alta |
| Exportação PDF/Excel do DRE | Relatório exportável | Média |

---

## Sprint 8.5 — Concluído

Fluxo de Caixa Real entregue (leitura 100% banco, sem mock). Correções críticas:

- Link `fluxo-caixa/nova` removido da UI até existir formulário
- Soft-delete de movimentações bancárias bloqueado (reversão somente via estorno)

**Pendências do Sprint 8.5:** nenhuma bloqueante.

### Movido do 8.5 para backlog

| Item | Descrição | Prioridade |
|------|-----------|------------|
| Paginação da lista unificada do Fluxo de Caixa | Paginar lançamentos realizados + previstos | Média |
| Projeções recorrentes futuras | Projetar além dos vencimentos cadastrados (sem recorrência hoje) | Baixa |
| Formulário “Nova movimentação” no Fluxo de Caixa | Rota `/{tenant}/financeiro/fluxo-caixa/nova` | Alta |
| UI de estorno de movimentação bancária | Fluxo visual de estorno (RPC já existe) | Alta |

---

## Itens planejados (próximos)

| Item | Descrição |
|------|-----------|
| Dashboard financeiro | Indicadores gerenciais além do DRE |
| Contas Bancárias (evolução) | Refinos operacionais além do histórico recente |
| Auditoria | Trilha completa de alterações financeiras |
| Upload de anexos | Implementação sobre `anexos_metadata` (estrutura já criada no 8.3) |
| CRUD de Fornecedores | Módulo completo; substitui cadastro mínimo atual |
| Competência nativa em Contas a Receber | Colunas `data_competencia` e `plano_conta_id` |

---

## Prioridade Alta

| Item | Descrição |
|------|-----------|
| Formulário “Nova movimentação” / UI de estorno | Completar o ciclo operacional do Fluxo de Caixa na UI. |
| Seleção inteligente de formas de pagamento | Melhorar o seletor de formas na venda para ocultar opções com `gera_financeiro = false` quando a venda exigir geração financeira. |
| Assistente de migração financeira | Ferramenta ou fluxo guiado para migrar dados financeiros antigos de forma segura por tenant. |
| Auditoria financeira completa | Trilha de auditoria para alterações em contas a receber, contas a pagar, baixas, cancelamentos e integração com vendas. |

---

## Prioridade Média

| Item | Descrição |
|------|-----------|
| Paginação da lista unificada do Fluxo de Caixa | Lista de lançamentos realizados + previstos sem paginação na 8.5. |
| Migração `forma_pagamento` → `forma_pagamento_id` | Script/migration para converter registros legados em vendas. |
| Remoção do campo legado | Após migração validada, remover compatibilidade com `forma_pagamento` (texto). |
| Detalhe da venda — classificação financeira | Ampliar exibição de categoria financeira e centro de custo no detalhe da venda. |

---

## Prioridade Baixa

| Item | Descrição |
|------|-----------|
| Projeções recorrentes no Fluxo de Caixa | Projetar caixa além dos vencimentos já cadastrados em CR/CP. |
| Título recebido bloqueia cancelamento da venda | **Manter comportamento atual.** |
| Status `vencido` calculado na exibição | **Manter comportamento atual.** |
| Orçamento sem forma de pagamento | **Manter comportamento atual.** |

---

## Decisões de Arquitetura

As decisões abaixo são **intencionais**. Não devem ser tratadas como bugs em revisões ou sprints futuros, salvo mudança explícita de regra de negócio.

### Integridade financeira

- **Faturamento atômico (RPC):** estoque, status da venda e contas a receber são criados em uma única transação PostgreSQL.
- **Cancelamento com título recebido:** bloqueio intencional para evitar inconsistência entre caixa/recebíveis e status da venda.
- **Exclusão de títulos:** somente após cancelamento lógico (`status = cancelado`); histórico preservado via soft delete.
- **Movimentações bancárias:** não podem ser soft-deletadas; reversão do saldo somente via **estorno** (RPC). Soft-delete direto deixaria `saldo_atual` inconsistente.

### Compatibilidade e evolução gradual

- **Campo legado `forma_pagamento` (texto):** mantido em vendas antigas; resolução via `resolveLegacyFormaPagamentoId` até migração em massa (backlog médio).
- **Forma de pagamento opcional no orçamento:** permite cadastro comercial ágil; validação restritiva apenas no faturamento quando `gera_financeiro = true` ou há indicadores de expectativa financeira.

### Modelo de status

- **`vencido` não persistido:** reduz complexidade de jobs e estados duplicados; listagens e cards calculam `status_exibicao` em tempo de leitura.
- **Multi-tenant:** todas as estruturas financeiras isoladas por `tenant_id` com RLS no Supabase.
- **Fornecedores mínimos (8.3):** tabela `fornecedores` criada para vínculo futuro; CRUD completo no backlog.
- **Anexos (8.3):** coluna `anexos_metadata` em `contas_pagar` reservada; upload no backlog.

### Migrations manuais

- SQL em `supabase/migrations/` **não é aplicado automaticamente** pelo repositório. Cada ambiente (dev/staging/prod) aplica scripts no Supabase SQL Editor com revisão humana.

---

## Referências

- Roadmap de sprints: [ROADMAP.md](./ROADMAP.md)
- Migrations do módulo financeiro: `supabase/migrations/`
