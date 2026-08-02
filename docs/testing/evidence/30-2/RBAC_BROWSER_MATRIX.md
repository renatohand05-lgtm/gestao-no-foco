# RBAC — matriz browser (tenant teste-renato-01)

| Papel observado | Sidebar Equipe admin | `/configuracoes/equipe` | Mutações |
|-----------------|----------------------|-------------------------|----------|
| Owner (QA) | Abas Convites/Equipes/Cargos visíveis | 200 + hub + KPIs | Server actions com `assertEquipeAdmin` |
| Visualizador / sem `usuarios.visualizar` e sem elevated | — | Feedback access denied | Bloqueado |

Gates de contrato: `test:phase30-rbac-scope`, `test:phase30-team-tenant-isolation`, `test:rbac` — 0 FAIL.

Isolamento: todas as queries de serviço filtram `tenant_id`; policies RLS + service role apenas após auth de admin.
