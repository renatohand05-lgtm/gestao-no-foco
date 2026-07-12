# Roadmap — Gestão no Foco

Roadmap oficial de entregas do produto.  
Última atualização: fechamento Sprint 8.6 (DRE Real).

---

## Marco atual

### Base Financeira Enterprise + Fluxo de Caixa + DRE

Entrega consolidada após os Sprints 8.1–**8.6**.

**Inclui:**

| Área | Entregas |
|------|----------|
| Estrutura financeira | Plano de contas, centros de custo, contas bancárias, formas de pagamento, categorias financeiras |
| Contas a Receber | CRUD, parcelamento, baixa integral, cancelamento, listagem com resumo, integração com clientes e vendas |
| Contas a Pagar | CRUD, parcelamento, baixa total/parcial, cancelamento, listagem com resumo, vínculos financeiros |
| Motor transacional | RPCs atômicas de movimentação, transferência, estorno e baixas (pagar/receber) |
| Fluxo de Caixa | Leitura real (CR, CP, movimentações, contas bancárias), previsto/realizado, filtros e projeção do período |
| DRE | Demonstração do Resultado por competência (vendas, CR avulsas, CP), com gaps de classificação |
| Integração Vendas ↔ Financeiro | `forma_pagamento_id`, `quantidade_parcelas`, classificação financeira, faturamento/cancelamento atômicos via RPC |
| UX / Design System | Hub financeiro, componentes reutilizáveis, feedback e validações claras |
| Segurança | Multi-tenant (`tenant_id`), RLS, validação de membro do tenant nas RPCs |

---

## Sprint 8.6 — CONCLUÍDO

**Status:** Concluído — DRE Real por competência, sem mock.

### Entregas

| Área | Detalhe |
|------|---------|
| DRE real | `DreService.getDre` lê vendas faturadas, CR avulsas, CP, categorias, plano de contas e centros de custo |
| Indicadores | Receita bruta, deduções, receita líquida, CMV, margem de contribuição, despesas operacionais, EBITDA, resultado final |
| Filtros | Período, centro de custo, categoria financeira, plano de contas |
| Classificação incompleta | Painel com campos faltantes explícitos por registro |
| Hub | Card DRE ativo; dashboard permanece no roadmap |

### Fora de escopo (movido para backlog)

- `data_competencia` / `plano_conta_id` em Contas a Receber
- Tipo `custo` em categorias/plano
- Depreciação/amortização real para EBITDA contábil
- Dashboard financeiro além do DRE
- Exportação PDF/Excel

---

## Sprint 8.5 — CONCLUÍDO

**Status:** Concluído — correções críticas aplicadas (link quebrado removido; soft-delete inseguro de movimentações bloqueado).

### Entregas

| Área | Detalhe |
|------|---------|
| Fluxo de Caixa real | Remoção total de mock; `FluxoCaixaService.getFluxo` lê `contas_bancarias`, `movimentacoes_bancarias`, `contas_receber`, `contas_pagar` |
| Indicadores | Saldo inicial, entradas/saídas previstas e realizadas, saldo diário, acumulado e projetado |
| Filtros | Período, conta bancária, categoria, centro de custo, status (`all` / `realizado` / `previsto`) |
| Integridade | Soft-delete de movimentações bancárias bloqueado; reversão somente via estorno |
| UI | Botão/rota `fluxo-caixa/nova` ocultados até existir formulário |

### Fora de escopo (movido para backlog)

- Paginação da lista unificada do Fluxo de Caixa
- Projeções recorrentes futuras além dos vencimentos cadastrados
- UI dedicada de estorno / formulário “Nova movimentação” no Fluxo de Caixa

---

## Sprint 8.4 — CONCLUÍDO (parcial operacional)

**Status:** Entregas operacionais de contas bancárias, motor transacional e estabilização de Contas a Receber concluídas no ciclo 8.4.x. Itens restantes (auditoria, anexos, CRUD fornecedores) permanecem no backlog.

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
| Hub | card **Contas a Pagar** ativo |

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

## Próximo (planejado)

| Item | Descrição |
|------|-----------|
| **Dashboard financeiro** | Indicadores gerenciais além do DRE |
| **Auditoria** | Trilha de alterações financeiras |
| **Upload de anexos** | Implementar upload sobre `anexos_metadata` |
| **CRUD de Fornecedores** | Módulo completo de fornecedores |
| **Nova movimentação / UI de estorno** | Formulário no Fluxo de Caixa e fluxo de estorno na UI |

### Regras (herdadas)

- Não alterar autenticação nem onboarding
- Migrations SQL separadas, sem execução automática
- Multi-tenant obrigatório
- Design System existente
- Não quebrar módulos já entregues

---

## Sprints (visão)

| Sprint | Módulo | Status |
|--------|--------|--------|
| 8.1 / 8.1.1 | Estrutura financeira + integrações vendas | Concluído |
| 8.2 | Contas a Receber | Concluído |
| 8.3 | Contas a Pagar | Concluído |
| 8.4.x | Motor transacional, contas bancárias, estabilização CR | Concluído (itens extras no backlog) |
| 8.5 | Fluxo de Caixa Real | Concluído |
| **8.6** | **DRE Real** | **Concluído** |
| Próximo | Dashboard, auditoria, anexos, fornecedores | Planejado |

---

## Documentos relacionados

- [Backlog técnico](./backlog-tecnico.md) — melhorias futuras e decisões de arquitetura
- [Módulo Clientes](../modulo-clientes.md) — documentação de referência de outro módulo
