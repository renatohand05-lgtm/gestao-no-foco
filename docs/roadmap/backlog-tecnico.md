# Backlog Técnico — Gestão no Foco

Documento de melhorias futuras do módulo financeiro e integrações relacionadas.  
**Não representa pendências bloqueantes** dos sprints concluídos — são evoluções planejadas.

Última atualização: fechamento Sprint 8.3.

---

## Sprint 8.4 — Backlog planejado

Itens oficialmente priorizados para o próximo sprint (ver [ROADMAP.md](./ROADMAP.md)):

| Item | Descrição |
|------|-----------|
| Fluxo de Caixa | Projeção diária e consolidada a partir de recebíveis, pagáveis e movimentações |
| Contas Bancárias | Evolução operacional do cadastro (saldos, movimentações, integração com baixas) |
| Auditoria | Trilha completa de alterações financeiras |
| Upload de anexos | Implementação sobre `anexos_metadata` (estrutura já criada no 8.3) |
| CRUD de Fornecedores | Módulo completo; substitui cadastro mínimo atual |

**Pendências do Sprint 8.3:** nenhuma.

---

## Prioridade Alta

| Item | Descrição |
|------|-----------|
| Seleção inteligente de formas de pagamento | Melhorar o seletor de formas na venda para ocultar opções com `gera_financeiro = false` quando a venda exigir geração financeira (parcelas, categoria, centro de custo ou forma com `gera_financeiro = true`). |
| Assistente de migração financeira | Ferramenta ou fluxo guiado para migrar dados financeiros antigos (formas em texto, vínculos incompletos, títulos órfãos) de forma segura por tenant. |
| Auditoria financeira completa | Trilha de auditoria para alterações em contas a receber, contas a pagar, baixas, cancelamentos e integração com vendas (quem, quando, valor anterior/novo). **Planejado para Sprint 8.4.** |

---

## Prioridade Média

| Item | Descrição |
|------|-----------|
| Migração `forma_pagamento` → `forma_pagamento_id` | Script/migration para converter registros legados que ainda usam o campo texto `forma_pagamento` para o UUID `forma_pagamento_id` no cadastro de vendas. |
| Remoção do campo legado | Após migração validada em produção, remover compatibilidade com `forma_pagamento` (texto) em mappers, validações e exibição. |
| Detalhe da venda — classificação financeira | Ampliar exibição de categoria financeira e centro de custo no detalhe da venda (Sprint 8.2.4 introduziu exibição básica quando os campos existem; revisar escopo: links, edição rápida, indicadores de propagação para títulos). |

---

## Prioridade Baixa

| Item | Descrição |
|------|-----------|
| Título recebido bloqueia cancelamento da venda | **Manter comportamento atual.** Venda faturada com título já recebido não pode ser cancelada até estorno manual — decisão de negócio para preservar integridade contábil. |
| Status `vencido` calculado na exibição | **Manter comportamento atual.** Status derivado de `aberto` + `data_vencimento < hoje` na camada de aplicação; não exige job de sincronização no banco. |
| Orçamento sem forma de pagamento | **Manter comportamento atual.** Orçamentos e vendas em andamento podem ser salvos sem forma de pagamento; a exigência ocorre apenas no faturamento quando a venda gera financeiro. |

---

## Decisões de Arquitetura

As decisões abaixo são **intencionais**. Não devem ser tratadas como bugs em revisões ou sprints futuros, salvo mudança explícita de regra de negócio.

### Integridade financeira

- **Faturamento atômico (RPC):** estoque, status da venda e contas a receber são criados em uma única transação PostgreSQL (`faturar_venda_atomico` / `cancelar_venda_atomico`). Evita venda faturada com estoque baixado e sem título financeiro.
- **Cancelamento com título recebido:** bloqueio intencional para evitar inconsistência entre caixa/recebíveis e status da venda.
- **Exclusão de títulos:** somente após cancelamento lógico (`status = cancelado`); histórico preservado via soft delete.

### Compatibilidade e evolução gradual

- **Campo legado `forma_pagamento` (texto):** mantido em vendas antigas; resolução via `resolveLegacyFormaPagamentoId` até migração em massa (backlog médio).
- **Forma de pagamento opcional no orçamento:** permite cadastro comercial ágil; validação restritiva apenas no faturamento quando `gera_financeiro = true` ou há indicadores de expectativa financeira.

### Modelo de status

- **`vencido` não persistido:** reduz complexidade de jobs e estados duplicados; listagens e cards calculam `status_exibicao` em tempo de leitura.
- **Multi-tenant:** todas as estruturas financeiras, contas a receber e contas a pagar isoladas por `tenant_id` com RLS no Supabase.
- **Fornecedores mínimos (8.3):** tabela `fornecedores` criada para vínculo futuro; CRUD completo previsto no Sprint 8.4.
- **Anexos (8.3):** coluna `anexos_metadata` em `contas_pagar` reservada; upload previsto no Sprint 8.4.

### Migrations manuais

- SQL em `supabase/migrations/` **não é aplicado automaticamente** pelo repositório. Cada ambiente (dev/staging/prod) aplica scripts no Supabase SQL Editor com revisão humana.

---

## Referências

- Roadmap de sprints: [ROADMAP.md](./ROADMAP.md)
- Migrations do módulo financeiro: `supabase/migrations/20260708_*.sql`
