# Fase 28 — ERP Multissetorial Enterprise

**Status:** Sprints 28.1–28.6 + **28.7 homologação** — **APROVADO COM RESSALVAS**  
**Pré-requisito:** Sprint 27.8 publicada (`d577ddd`)  
**Migrations Phase 28:** aplicadas no Supabase (CRM corrigida em 28.6.1)  
**Evidências 28.7:** `docs/testing/evidence/28-7/REPORT.md`  
**Pente-fino residual / commit único:** aguardando autorização do usuário (sem commit automático)

## Princípios

1. **Reutilizar** módulos Sprint 14–27 (CRM, Supply 25, Estoque, OS, Financeiro, DRE).
2. **Não duplicar** entidades (`clientes` = base única; leads = estágio `lead`).
3. **Não alterar** fórmulas DRE/Fluxo/meta canônicas sem evidência.
4. **Não afirmar** WhatsApp, bancos, emissão fiscal ou IA externa sem provider real.
5. **Migrations** apenas idempotentes; **não executar** automaticamente.
6. Identidade visual (logo/paleta/GF) preservada.

## Fontes canônicas por domínio

| Domínio | Fonte canônica | Não criar |
|---------|----------------|-----------|
| Leads / clientes | `public.clientes` + `estagio_funil` | tabela `leads` |
| Pipeline config | `crm_pipeline_stages` | stages hardcoded novos |
| Oportunidades | `crm_oportunidades` + `crm_stage_movements` | segundo CRM |
| Follow-ups | `cliente_tarefas` + agenda `follow_up` | `follow_ups` |
| Agenda | `cliente_agendamentos` (+ Fase 28 recursos) | calendário paralelo |
| Compras | `compras_pedidos` status workflow | solicitação isolada sem necessidade |
| Cotação | `compras_cotacoes*` | compare-only ephemeral |
| Estoque saldo | `produtos.estoque_*` + `estoque_movimentacoes` | segundo ledger |
| Depósitos/lotes | `estoque_depositos*`, `estoque_lotes*`, `estoque_series*` | recriar |
| OS / OT | `ordens_servico` + `tipo_ordem` | tabela OT separada |
| Financeiro | `lib/financeiro` + `lib/finance` + `lib/dre` | engines paralelos |
| Orçamento | `finance_budgets*` (nova, Fase 28) | misturar com metas vendas |
| Aging | cálculo sobre `contas_receber` | inventar saldos |

## Sprint map (entrega contínua)

| Sprint | Foco | Estratégia |
|--------|------|------------|
| 28.1 CRM V2 | Leads inbox, oportunidades UI, follow-ups, KPIs vivos, conversão | Productizar serviços Fase 24 |
| 28.2 Compras V2 | Fluxo completo sem pular cotação; mapa comparativo persistido | Fechar gaps Supply 25 |
| 28.3 Estoque V2 | ABC, reposição, depósitos/movimentações auditáveis | UI + services sobre schema 25/2543 |
| 28.4 OT Universal | `tipo_ordem` + templates; oficina opcional | Additive on OS |
| 28.5 Agenda | Calendário dia/semana/lista; conflitos; recursos | Sobre `cliente_agendamentos` |
| 28.6 Financeiro V2 | CFO, aging, orçamento, orçado×realizado | Wrap canônico; sem mudar DRE |

## RBAC (adições Fase 28)

- `crm.converter`, `crm.ver_todos_responsaveis`, `crm.configurar` (alias pipeline)
- `agenda.visualizar|criar|editar|excluir|sobrescrever_conflito`
- `financeiro.orcamento.*`, `financeiro.aging.visualizar`, `financeiro.cfo.visualizar`
- `os.templates.configurar` (quando aplicável)
- Compras/estoque: reutilizar chaves existentes; não bypass

## Integrações futuras (contratos)

WhatsApp, e-mail, telefonia, calendário externo, IA: status explícito  
`nao_configurado | indisponivel | aguardando_integracao`  
Implementação: `lib/crm/enterprise/integration-architecture.ts` + stubs Agenda/Finance.

## Riscos e dívida

1. Dual pipeline (`estagio_funil` vs `crm_oportunidades`) — unificar na 28.7.
2. Motor estoque ainda centrado em `produtos.estoque_atual` (depósitos schema-ahead).
3. Recebimento compras vs NF-e paralelo.
4. Orçamento financeiro depende de migration não aplicada.
5. Sessão Playwright expirada pode bloquear homologação autenticada em produção.

## Classificação esperada pós-28.1–28.6

**APROVADO COM RESSALVAS** enquanto migrations não aplicadas e homologação autenticada incompleta.  
Encerramento pleno → Sprint 28.7.
