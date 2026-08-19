# Notificações de cliente (Sprint 35.3.1)

Infraestrutura em cima da **outbox 35.2 / 35.2.2**. Não há fila paralela. Billing não é alterado.

## Estado desta entrega

| Canal | Produção |
|---|---|
| WhatsApp real | **test + allowlist** (nunca `live`) |
| E-mail real | **test + allowlist** (nunca `live`) |
| Cron | **DISABLED** |
| `COMMUNICATION_MODE` | **test** (nunca `live` nesta sprint) |
| Allowlist | `COMMUNICATION_TEST_ALLOWLIST` (valores só em env) |

Nenhum provider real envia sem `WHATSAPP_ENABLED=true` / `EMAIL_ENABLED=true`, destinatário na allowlist em `test`. Fora da allowlist: status `blocked`, `error_code`/`failure_kind=blocked_by_allowlist`, **zero HTTP**. `2xx` = `sent`, não `delivered`.

## Eventos P0 do piloto (tenant default OFF)

- `AGENDAMENTO_CRIADO`
- `AGENDAMENTO_CONFIRMADO`
- `BUDGET_PUBLISHED` (versão + link `/inspecao/{token}` + outbox; sem fatura/estoque)
- `SERVICE_READY` (não marca `entregue`)

## Pipeline

draft / scheduled / queued / processing / sent / delivered / read / failed / cancelled / suppressed / **blocked**

`sent` = provider aceitou. `delivered` só via webhook. Opt-out = `suppressed`. Allowlist = `blocked`.

## Variáveis de template

`cliente`/`cliente_nome`, `empresa`/`empresa_nome`, `data`, `hora`, `veiculo`, `modelo`, `placa`, `valor`, `secure_link`, `dias_para_retorno`. Sem eval.
