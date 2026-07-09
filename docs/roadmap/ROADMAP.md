# Roadmap — Gestão no Foco

Roadmap oficial de entregas do produto.  
Última atualização: fechamento Sprint 8.3.

---

## Marco atual

### Base Financeira Enterprise Finalizada

Entrega consolidada após os Sprints 8.1, 8.1.1, **8.2** e **8.3**.

**Inclui:**

| Área | Entregas |
|------|----------|
| Estrutura financeira | Plano de contas, centros de custo, contas bancárias, formas de pagamento, categorias financeiras |
| Contas a Receber | CRUD, parcelamento, baixa, cancelamento, listagem com resumo, integração com clientes e vendas |
| Contas a Pagar | CRUD, parcelamento, baixa total/parcial, cancelamento, listagem com resumo, vínculos financeiros |
| Integração Vendas ↔ Financeiro | `forma_pagamento_id`, `quantidade_parcelas`, classificação financeira na venda, faturamento/cancelamento atômicos via RPC |
| UX / Design System | Hub financeiro, componentes reutilizáveis, feedback e validações claras |
| Segurança | Multi-tenant (`tenant_id`), RLS, validação de membro do tenant nas RPCs |

**Migrations relacionadas (aplicação manual no Supabase):**

1. `20260708_create_plano_contas.sql`
2. `20260708_create_centros_custo.sql`
3. `20260708_create_contas_bancarias.sql`
4. `20260708_create_formas_pagamento.sql`
5. `20260708_create_categorias_financeiras.sql`
6. `20260708_vendas_forma_pagamento_id.sql`
7. `20260708_create_contas_receber.sql`
8. `20260708_vendas_quantidade_parcelas.sql`
9. `20260708_vendas_classificacao_financeira.sql`
10. `20260708_rpc_faturar_cancelar_venda.sql`
11. `20260708_rpc_faturar_venda_financeiro_opcional.sql`
12. `20260708_rpc_faturar_validacao_financeira.sql`
13. `20260708_create_contas_pagar.sql` (inclui `fornecedores` mínimo)

---

## Sprint 8.3 — CONCLUÍDO

**Status:** Concluído — **nenhuma pendência remanescente.**

### Entregas

| Área | Detalhe |
|------|---------|
| Migration | `fornecedores` (cadastro mínimo) + `contas_pagar` com RLS, parcelamento, `anexos_metadata` |
| Domínio | types, validations Zod, service, server actions, mappers, constants, utils |
| UI | listagem, 6 cards de resumo, filtros, busca, ordenação, paginação, formulário, detalhe |
| Baixas | pagamento total (`pago`) e parcial (`parcial`) |
| Integrações | forma de pagamento, categoria, centro de custo, plano de contas, conta bancária na baixa |
| Hub | card **Contas a Pagar** ativo; item removido do roadmap placeholder |

**Rotas entregues:**

- `/[tenant]/financeiro/contas-pagar`
- `/[tenant]/financeiro/contas-pagar/nova`
- `/[tenant]/financeiro/contas-pagar/[id]`
- `/[tenant]/financeiro/contas-pagar/[id]/editar`

**Critérios de aceite atendidos:**

- Multi-tenant preservado
- Design System existente
- Sem alteração em autenticação/onboarding
- Módulos anteriores intactos (Clientes, Produtos, Estoque, Vendas, Contas a Receber, Financeiro estrutural)
- Lint e build passando

---

## Sprint 8.2 — CONCLUÍDO

| Sub-sprint | Foco | Status |
|------------|------|--------|
| **8.2** | Contas a Receber Enterprise (módulo completo) | Concluído |
| **8.2.2** | Faturamento atômico, parcelas, cancelamento financeiro | Concluído |
| **8.2.3** | Forma opcional quando `gera_financeiro = false`, propagação categoria/centro | Concluído |
| **8.2.4** | Validação final: bloqueio de faturamento financeiro sem forma | Concluído |

**Backlog técnico geral:** ver [backlog-tecnico.md](./backlog-tecnico.md).

---

## Sprint 8.4 — Próximo (planejado)

**Status:** Aguardando aprovação para início.

### Backlog do Sprint 8.4

| Item | Descrição |
|------|-----------|
| **Fluxo de Caixa** | Projeção e consolidado diário a partir de contas a receber, contas a pagar e movimentações bancárias |
| **Contas Bancárias** | Evolução operacional do cadastro existente (Sprint 8.1): saldos, movimentações e integração com baixas de receber/pagar |
| **Auditoria** | Trilha de alterações financeiras (criação, baixa, cancelamento, edição) |
| **Upload de anexos** | Implementar upload sobre a estrutura `anexos_metadata` já preparada em contas a pagar |
| **CRUD de Fornecedores** | Módulo completo de fornecedores (hoje: tabela mínima + `fornecedor_nome` livre) |

### Regras (herdadas)

- Não alterar autenticação nem onboarding
- Migrations SQL separadas, sem execução automática
- Multi-tenant obrigatório
- Design System existente
- Não quebrar módulos já entregues

### Fora de escopo do 8.4

- DRE e dashboard financeiro (Sprint 8.5)
- Itens de backlog técnico de prioridade média/baixa não listados acima

---

## Sprints futuros (visão)

| Sprint | Módulo | Status |
|--------|--------|--------|
| 8.1 / 8.1.1 | Estrutura financeira + integrações vendas | Concluído |
| 8.2 | Contas a Receber | Concluído |
| **8.3** | **Contas a Pagar** | **Concluído** |
| **8.4** | Fluxo de caixa, contas bancárias operacional, auditoria, anexos, fornecedores | Planejado |
| 8.5 | DRE e dashboard | Planejado |

---

## Documentos relacionados

- [Backlog técnico](./backlog-tecnico.md) — melhorias futuras e decisões de arquitetura
- [Módulo Clientes](../modulo-clientes.md) — documentação de referência de outro módulo
