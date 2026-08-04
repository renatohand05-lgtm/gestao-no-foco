# Mobile Operations API (Sprint 31.6)

Base: `/api/mobile/v1/tenants/:tenantId/operacao`

Auth: Bearer + membership + permissions (sem service role no client mobile).

| Método | Path | Compose |
|--------|------|---------|
| GET | `/dashboard` | `composeOpsDashboard` |
| GET | `/work-orders` | `composeOpsWorkOrders` · `q`, `status`, `page` |
| GET | `/work-orders/:id` | `composeOpsWorkOrderDetail` |
| GET | `/schedule` | `composeOpsSchedule` · `range=hoje\|semana` |
| GET | `/team` | `composeOpsTeam` |
| GET | `/vehicles` | `composeOpsVehicles` · `q`, `page` |
| GET | `/vehicles/:id` | `composeOpsVehicleDetail` |
| GET | `/customers` | `composeOpsCustomers` · `q`, `page` |
| GET | `/customers/:id` | `composeOpsCustomerDetail` |
| GET | `/notifications` | `composeOpsNotifications` |

## Fontes

- Board/counts: `CentroOperacoesService`
- Fat/ticket: `OsDashboardService`
- Ocupação recurso: `RecursosOcupacaoService`
- Produtividade (média dos KPIs mecânicos existentes): `MecanicosDashboardService`
- OS: `OrdemServicoService` + anexos `InspecaoStorageService`
- Agenda: `AgendaEventService` + `detectAgendaConflicts`
- Equipe oficina: `MecanicoService` (não `lib/equipe` HR)
- Veículos: tabela `veiculos` + `VeiculoService.getById` / histórico OS por `veiculo_id`
- Clientes: `ClienteService`
- Alertas: `AlertasOperacionaisService.listPersisted`
