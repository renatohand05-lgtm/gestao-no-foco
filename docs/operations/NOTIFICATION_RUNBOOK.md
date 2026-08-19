# Runbook — comunicação (35.2 + 35.2.2 + 35.2.3 + 35.3.1)

## Modos WhatsApp

| Modo | Efeito | Outbox |
|---|---|---|
| `disabled` | Nada | `cancelled` / `suppressed` |
| `dry_run` | Preview | `dry_run` |
| `manual_link` | `wa.me` | `manual_opened` (não é DELIVERED) |
| `meta_cloud` | HTTP Graph **somente** se kill switch ON **e** `COMMUNICATION_MODE` permitir | `ready` → `sent`/`failed` |

Default produção: DRY_RUN + kill switch OFF + `COMMUNICATION_MODE=test`. `2xx` do provider = `sent`, nunca `delivered`.

## COMMUNICATION_MODE

| Valor | Efeito |
|---|---|
| `disabled` | Nenhum provider real |
| `test` | HTTP real só se kill switch ON **e** destinatário na allowlist |
| `live` | Fluxo real — **não ativar nesta sprint** |

`COMMUNICATION_TEST_ALLOWLIST` — telefones (`+5511912345678`) e e-mails (`usuario@dominio.com`), separados por vírgula. Fora da lista: `blocked` + `failure_kind=blocked_by_allowlist`, **zero HTTP**.

Ausente = comportamento seguro (`test`, sem allowlist ⇒ bloqueia envio real). Nunca assume `live`.

## E-mail

`EMAIL_PROVIDER=disabled|dry_run|resend`. Kill switch `EMAIL_ENABLED`. Remetente = `EMAIL_FROM` verificado no Resend. Reply-to opcional: `EMAIL_REPLY_TO`. Sem remetente falso. Sem webhook de delivery neste código: `sent` ≠ `delivered`.

Com `EMAIL_ENABLED=true` e `EMAIL_PROVIDER` vazio, o runtime usa Resend. `dry_run` explícito continua vencendo.

## Outbox (única fila)

Estados 35.2 + `draft`, `scheduled`, `queued`, `suppressed`, `blocked` (allowlist em `COMMUNICATION_MODE=test`).

Retry: backoff, máx. 5, **mesma linha**. Falha permanente (opt-out, destino inválido, template, allowlist) não agenda retry. Reenvio manual exige `crm.notificacoes.enviar`, só `FAILED`, e gera auditoria. Não reenviar `DELIVERED`.

## Webhook

`/api/webhooks/whatsapp` — assinatura obrigatória. Dedupe `notification_webhook_events (provider, event_id)` **antes** de aplicar status. Status monotônico (`sent` ← `delivered` ← `read`). Evento fora de ordem é ignorado.

Inbound `SIM` ligado a retorno ativo → `cliente_respondeu_sim` (**não** cria horário).

## Cron

`/api/cron/retention` Bearer `CRON_SECRET`. **PRODUCTION: DISABLED.**

Job força `dry_run` no planejamento de retornos. Sem `setInterval` no processo web.

## Homologação 35.3.1 (test + allowlist)

A. cadastrar cliente de teste na allowlist
B. criar agendamento (`AGENDAMENTO_CRIADO`)
C. confirmar agendamento (`AGENDAMENTO_CONFIRMADO`, flag tenant)
D. publicar orçamento (`BUDGET_PUBLISHED`, sem faturar)
E. finalizar serviço (`SERVICE_READY` → `pronto_para_entrega`, nunca `entregue`)
F. outbox WhatsApp/e-mail com `provider_message_id` se o provider aceitar
G. webhook confirmar `delivered` (só então marcar DELIVERED)

Sem disparo em massa. Automações default OFF; ligar só no tenant de teste.

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
- `EMAIL_REPLY_TO`
- `CRON_SECRET`

## Rollback

1. `WHATSAPP_ENABLED=false`, `EMAIL_ENABLED=false`, `COMMUNICATION_MODE=test` (ou `disabled`)
2. Não cadastrar cron na Vercel
3. Tenant: desligar preferências em Configurações → Comunicações
