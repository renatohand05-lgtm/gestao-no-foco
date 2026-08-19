# Runbook — comunicação (35.2 + 35.2.2 + 35.2.3)

## Modos WhatsApp

| Modo | Efeito | Outbox |
|---|---|---|
| `disabled` | Nada | `cancelled` / `suppressed` |
| `dry_run` | Preview | `dry_run` |
| `manual_link` | `wa.me` | `manual_opened` (não é DELIVERED) |
| `meta_cloud` | HTTP Graph **somente** se kill switch ON **e** `COMMUNICATION_MODE` permitir | `ready` → `sent`/`failed` |

Default produção: DRY_RUN + kill switch OFF + `COMMUNICATION_MODE=test`.

## COMMUNICATION_MODE

| Valor | Efeito |
|---|---|
| `disabled` | Nenhum provider real |
| `test` | HTTP real só se kill switch ON **e** destinatário na allowlist |
| `live` | Fluxo real — **não ativar nesta sprint** |

`COMMUNICATION_TEST_ALLOWLIST` — lista de telefones/e-mails de homologação (valores só em secret/env, nunca no git).

## E-mail

`EMAIL_PROVIDER=disabled|dry_run|resend`. Kill switch `EMAIL_ENABLED`. Remetente = `EMAIL_FROM` verificado no Resend. Sem remetente falso.

## Outbox (única fila)

Estados 35.2 + `draft`, `scheduled`, `queued`, `suppressed`, `blocked` (allowlist em `COMMUNICATION_MODE=test`).

Retry: backoff, máx. 5, **mesma linha**. Falha permanente (opt-out, destino inválido, template) não agenda retry. Reenvio manual exige `crm.notificacoes.enviar` e gera auditoria.

## Webhook

`/api/webhooks/whatsapp` — assinatura obrigatória. Dedupe `notification_webhook_events (provider, event_id)` **antes** de aplicar status. Status monotônico (`sent` ← `delivered` ← `read`). Evento fora de ordem é ignorado.

Inbound `SIM` ligado a retorno ativo → `cliente_respondeu_sim` (**não** cria horário).

## Cron

`/api/cron/retention` Bearer `CRON_SECRET`. **PRODUCTION: DISABLED.**

Job força `dry_run` no planejamento de retornos. Sem `setInterval` no processo web.

## Homologação futura (preparada, não executada)

A. cadastrar cliente de teste
B. criar agendamento
C. gerar confirmação
D. processar outbox
E. provider aceitar
F. mensagem chegar
G. webhook confirmar entrega
H. timeline atualizar
I. oficina/lava
J. finalizar serviço
K. avisar cliente
L. receber WhatsApp/e-mail
M. confirmar delivered
N. registrar retirada

Próximo passo: um único destinatário na allowlist. Sem disparo em massa.

## Envs (nomes)

- `COMMUNICATION_MODE`
- `COMMUNICATION_TEST_ALLOWLIST`
- `RETENTION_NOTIFY_MODE`
- `WHATSAPP_ENABLED`
- `WHATSAPP_PROVIDER`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `EMAIL_ENABLED`
- `EMAIL_PROVIDER`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `CRON_SECRET`

## Rollback

1. `WHATSAPP_ENABLED=false`, `EMAIL_ENABLED=false`, `COMMUNICATION_MODE=test` (ou `disabled`)
2. Não cadastrar cron na Vercel
3. Tenant: desligar preferências em Configurações → Comunicações
