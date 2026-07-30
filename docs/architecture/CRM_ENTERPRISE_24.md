# CRM Enterprise — Fase 24

Elevação do CRM Sprint 14 para camada **Enterprise**, sem duplicar a base `public.clientes`.

## Princípios

- Base única de clientes (`lib/clientes` + `public.clientes`)
- Multitenant via `requireTenant` + RBAC `crm.*`
- Multiempresa/multifilial: campos opcionais + `crm_pipeline_stages.empresa_id` (migration 20260812 — aplicar manualmente)
- IA comercial determinística (sem inventar)
- Integrações = arquitetura apenas (WhatsApp, e-mail, telefonia, ERP, API)

## Rotas

| Rota | Função |
|------|--------|
| `/[tenant]/crm` | Redirect → executivo |
| `/[tenant]/crm/executivo` | Dashboard Enterprise |
| `/[tenant]/crm/pipeline` | Etapas configuráveis |
| `/[tenant]/crm/agenda` | Ponte para agenda/tarefas |
| `/[tenant]/crm/indicadores` | Catálogo KPI |
| `/[tenant]/crm/integracoes` | Conectores em preparação |
| `/[tenant]/clientes/*` | Cadastro + Kanban + 360 (inalterado como fonte) |

## Migration

`supabase/migrations/20260812_crm_enterprise_fase24.sql`

- `clientes.empresa_id`, `filial_id`, `nome_fantasia`, `ie_rg`, campos de oportunidade no cadastro
- `cliente_contatos` (filho do cliente)
- `crm_pipeline_stages`
- `crm_oportunidades` + `crm_stage_movements`
- Ampliação de tipos de agenda

**Status Sprint 24.2:** migration aplicada manualmente no Supabase. App lê/grava via Supabase — sem fallback silencioso em memória para etapas (seed explícito quando vazio).

**Oportunidades UI:** ciclo básico via services/actions + campos no cadastro/funil; CRUD visual completo de oportunidades permanece como evolução.

## Testes

```bash
npm run test:crm-core
npm run test:crm-experience
```

## Flags

- `CRM_ENTERPRISE_ENABLED` (default on)
- `CRM_EXTERNAL_AI_ENABLED` (default off)
- `CRM_EXTERNAL_INTEGRATIONS_ENABLED` (default off)
