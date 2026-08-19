# Notificações de cliente (Sprint 35.2.3 + 35.3)

Infraestrutura em cima da **outbox 35.2 / 35.2.2**. Não há fila paralela. Billing não é alterado.

## Estado desta entrega

| Canal | Produção |
|---|---|
| WhatsApp real | **MANUAL PENDING** (kill switch OFF até homologação) |
| E-mail real | **MANUAL PENDING** (kill switch OFF até homologação) |
| Cron | **DISABLED** |
| `COMMUNICATION_MODE` | **test** (nunca `live` nesta sprint) |
| Allowlist | `COMMUNICATION_TEST_ALLOWLIST` (valores só em env) |

Nenhum provider real envia sem `WHATSAPP_ENABLED=true` / `EMAIL_ENABLED=true`, destinatário na allowlist em `test`. Fora da allowlist: status `blocked`, `error_code=blocked_by_allowlist`, **zero HTTP**.

## Eventos P0 do piloto (tenant default OFF)

- `AGENDAMENTO_CRIADO`
- `AGENDAMENTO_CONFIRMADO`
- `BUDGET_PUBLISHED` (versão + link `/inspecao/{token}` + outbox)
- `SERVICE_READY` (não marca `entregue`)

## Pipeline

draft / scheduled / queued / processing / sent / delivered / read / failed / cancelled / suppressed / **blocked**

`sent` = provider aceitou. `delivered` só via webhook. Opt-out = `suppressed`. Allowlist = `blocked`.

## Variáveis de template

`cliente`/`cliente_nome`, `empresa`/`empresa_nome`, `data`, `hora`, `veiculo`, `modelo`, `placa`, `valor`, `secure_link`, `dias_para_retorno`. Sem eval.
