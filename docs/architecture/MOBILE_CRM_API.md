# Mobile CRM API

Base: `/api/mobile/v1/tenants/:tenantId/crm`

Auth: `Authorization: Bearer` + membership + RBAC (`authorizeCrmRoute`).

| Método | Path | Compose |
|--------|------|---------|
| GET | `/dashboard` | `composeCrmDashboard` |
| GET | `/pipeline` | `composeCrmPipeline` |
| GET | `/clients` | `composeCrmClients` (`?q=`) |
| GET | `/clients/:id` | `composeCrmClientDetail` |
| GET | `/timeline` | `composeCrmTimeline` (`?clienteId=`) |
| GET | `/followups` | `composeCrmFollowups` |
| GET | `/opportunities` | `composeCrmOpportunities` |
| GET | `/forecast` | `composeCrmForecast` |
| GET | `/ranking` | `composeCrmRanking` |
| GET | `/alerts` | `composeCrmAlerts` |

Respostas: JSON presentation (strings monetárias formatadas). `Cache-Control: no-store`.

Erros: `401` auth, `403` `FORBIDDEN_CRM`, `500` friendly DB.

Client Expo: `apps/mobile/src/api/mobile-api.ts` (`fetchCrm*`).
