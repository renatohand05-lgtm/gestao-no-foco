# Agenda, retornos e fidelização (Sprint 35.2)

Motor operacional em cima da agenda e do CRM existentes. **Não** é um ERP paralelo.

## Reuso (auditoria)

| Peça | Fonte |
|---|---|
| Eventos | `agenda_eventos` |
| Conflito / recorrência | `lib/agenda/conflict.ts` |
| RBAC agenda | `agenda.visualizar\|criar\|editar\|excluir\|sobrescrever_conflito` |
| Timezone | `lib/dashboard/tenant-timezone.ts` (`America/Sao_Paulo`) |
| WhatsApp real | **não existia** — só `wa.me` |
| Motor in-app `lib/notifications` | **não** é canal de cliente |

## Naturezas (métricas separadas)

| Natureza | Uso | KPI de “clientes agendados” |
|---|---|---|
| `cliente` | Atendimento | Sim |
| `negocio` | Reunião, call, follow-up comercial | Não |
| `interno` | Bloqueio, almoço, folga | Não (bloqueia horário) |

Inferência sem migration: `origem` ∈ naturezas, senão tipo interno, senão `cliente_id`, senão `negocio`.

Retorno previsto **≠** agendamento: não reserva slot. Resposta SIM → `cliente_respondeu_sim` (fila “aguardando agendamento”), **nunca** cria horário sozinha.

## Modelos novos (migration `20260902`)

- `customer_returns`
- `service_return_rules`
- `communication_preferences`
- `notification_outbox` (`unique (tenant_id, idempotency_key)`)
- colunas opcionais em `agenda_eventos`

Código degrada se a migration ainda não estiver aplicada (listas vazias / insert legado).

## Segmentação

Capabilities novas (todos os 6 segmentos, fora de `BASE_CAPABILITIES`):

- `customer_returns`
- `customer_retention`
- `customer_notifications`

Aliases: `client_appointments`, `business_calendar`, `staff_availability` → `appointments`.

Defaults de retorno (sugeridos, não obrigatórios): oficina data e/ou km; lava 15d; barbearia 30d; estética/odonto sessão/data com `hide_procedure`; consultoria follow-up.

## Privacidade

Estética/odonto: templates sem nome de procedimento quando `hide_procedure`. Sem prontuário, diagnóstico ou odontograma.

## Rollback

1. Não aplicar/reverter migration em production sem revisão.
2. UI e jobs degradam se tabelas faltarem.
3. Desligar: `RETENTION_NOTIFY_MODE=disabled` (opcional; default já é `dry_run` no código).
4. Não cadastrar cron na Vercel até homologação.

## Homologação

Pendente — ver `docs/testing/evidence/35-2/REPORT.md`.
