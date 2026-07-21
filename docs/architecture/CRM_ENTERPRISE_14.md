# CRM Enterprise — Sprint 14

Transformação do módulo **Clientes** em CRM de nível enterprise, mantendo multi-tenant, RLS, Design System e padrão service/actions.

## Migration

Arquivo: `supabase/migrations/20260726_crm_enterprise.sql`

**Aplicar manualmente** no Supabase SQL Editor (mesmo fluxo das sprints anteriores).

### Alterações

| Área | Detalhe |
|------|---------|
| `clientes` | `classificacao`, `score`, `consultor_id`, `estagio_funil` |
| `cliente_eventos` | Timeline cronológica |
| `cliente_tarefas` | Tarefas comerciais (ligar, proposta, cobrança, revisão, WhatsApp) |
| `cliente_agendamentos` | Agenda de relacionamento |

RLS: políticas via `tenant_members` em todas as tabelas novas.

## Rotas

| Rota | Função |
|------|--------|
| `/[tenant]/clientes` | Lista + subnav CRM |
| `/[tenant]/clientes/novo` | Cadastro inteligente |
| `/[tenant]/clientes/[id]` | Visão 360° (tabs) |
| `/[tenant]/clientes/funil` | Kanban comercial |
| `/[tenant]/clientes/tarefas` | Tarefas abertas |
| `/[tenant]/clientes/agenda` | Agenda 30 dias |
| `/[tenant]/clientes/dashboard` | KPIs comerciais |

## Serviços (`lib/crm/`)

- `cliente-timeline-service.ts` — eventos
- `cliente-tarefa-service.ts` — tarefas
- `cliente-agenda-service.ts` — agenda
- `cliente-360-service.ts` — agregação OS/vendas/financeiro/veículos
- `crm-funnel-service.ts` — Kanban por `estagio_funil`
- `crm-tags.ts` — seed etiquetas padrão (VIP, Frota, etc.)
- `actions.ts` — server actions CRM

## Etiquetas

Reutiliza `tags` + `entity_tags` (`entity_type='cliente'`). Slugs padrão:

`vip`, `garantia`, `frota`, `inadimplente`, `retorno`, `parceiro`, `indicacao`

## Funil

Estágios em `clientes.estagio_funil`:

`lead` → `contato` → `proposta` → `negociacao` → `fechado` / `perdido`

## Busca global

`lib/master-data/master-data-search.ts` ampliado:

- Nome, CPF/CNPJ, e-mail, telefone, WhatsApp
- Placa via `veiculos` → cliente

## KPIs (dashboard)

- Novos clientes (30d)
- Clientes ativos
- Ticket médio (vendas faturadas)
- Receita por cliente
- Taxa de conversão (fechado / total)
- Receita por vendedor (`vendas.created_by`)
- Distribuição do funil

## Testes

```bash
npm run test:crm
npm run audit:schema
```

Script: `scripts/crm-enterprise-preflight.mjs` — valida constantes, arquivos e expectativas de schema (offline).

## Compatibilidade

- Serviços degradam graciosamente se a migration ainda não foi aplicada (timeline/tarefas/agenda retornam `[]`).
- Campos CRM em `clientes` usam defaults no service (`estagio_funil: lead`, `score: 0`).
