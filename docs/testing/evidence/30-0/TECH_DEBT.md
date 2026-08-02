# Sprint 30.0 — Dívida Técnica

## Inventário

| Item | Classificação | Notas |
|------|---------------|-------|
| Marcadores `TODO`/`FIXME` reais em app/lib/components | **Aceitar** | ~0 marcadores reais (falsos positivos em PT “todo”) |
| Nav copy oficina / Mecânicos | **Resolver na Fase 30** | `config/navigation.ts` |
| Rotas `oficina/mecanicos`, `ordens/mecanicos` | **Resolver na Fase 30** | dual path |
| RBAC admin UI ausente (usuários/perfis) | **Resolver na Fase 30 (P1)** | stub Configurações |
| Dual stacks `lib/rbac` + `lib/permissoes` | **Backlog** | bridges por módulo já existem |
| Bridges `*-rbac-compat` (crm/supply/analytics/…) | **Aceitar** curto prazo · unificar médio | necessário pós-29.10 |
| Types manuais / drift `supabase gen types` | **Backlog** | dívida Fase 28/29 |
| Evidências untracked `27-8-*` | **Aceitar** / limpar local | não versionar |
| Scripts homolog legados (26.x–29.x) | **Aceitar** | histórico de release |
| Migrations defensivas 60814/60818 | **Aceitar** | corretivas necessárias |
| Warnings lint (28) | **Backlog** | 0 errors |
| `MODULE_TYPELESS_PACKAGE_JSON` em intelligence | **Backlog** | warning Node |
| Dashboard: 116 arquivos em `components/dashboard` | **Backlog** | complexidade / bundle |
| Engines legadas paralelas (gf / executive / enterprise empty states) | **Backlog** | consolidar empty states |
| Deep imports / barrels | **Aceitar** com política Fase 29 | `BARREL_POLICY.md` |
| Casts / `any` | **Backlog** | não medido exaustivamente nesta sprint |
| Dependências / npm audit | **Backlog** | não bloqueante release 29 |
| Centro Operações / Mecânicos lentos | **Resolver na Fase 30 (P1)** | performance |
| Chrome global “Apresentação” | **Resolver na Fase 30 (P1)** | UX transversal |
| Analytics skeleton / legibilidade | **Resolver na Fase 30** | experiência |
| Secrets / .env / auth | **OK** | gitignored |

## Bloquear antes da Fase 30?

**Não.** Nenhum P0 de segurança/perda de dados evidenciado no runtime autenticado desta sprint.  
Plataforma **pronta para executar Fase 30** com P1 de experiência/performance/multissetorial.

## Segurança e confiança (revisão leve)

| Tema | Status |
|------|--------|
| RBAC server-side | Presente (`lib/rbac`, guards) |
| Tenant isolation | Preservado (padrão Fase 29) |
| Deep links autenticados | OK (DRE nova aba) |
| Client vs server permissões | Server é autoridade; metadata nav alinhada |
| Sessão / refresh | Persistiu no audit |
| Admin de membros | **Lacuna de produto** (não é bypass RBAC; é ausência de UI) |
| Mensagens técnicas | Sem UUID/schema errors na amostra |
| Secrets no repo | Não observados no working tree rastreado |
