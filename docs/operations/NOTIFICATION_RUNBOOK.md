# Runbook — comunicação (35.2 + 35.2.2)

## Modos WhatsApp

| Modo | Efeito | Outbox |
|---|---|---|
| `disabled` | Nada | `cancelled` |
| `dry_run` | Preview | `dry_run` |
| `manual_link` | `wa.me` | `manual_opened` (não é DELIVERED) |
| `meta_cloud` | HTTP Graph **somente** se `WHATSAPP_ENABLED=true` | `ready` → `sent`/`failed` |

Default produção: DRY_RUN + kill switch OFF.

## E-mail

`EMAIL_PROVIDER=disabled|dry_run|resend`. Kill switch `EMAIL_ENABLED`. Remetente = `EMAIL_FROM` verificado no Resend. Sem remetente falso.

## Outbox (única fila)

Estados: `pending`, `ready`, `processing`, `dry_run`, `manual_opened`, `sent`, `delivered`, `read`, `failed`, `cancelled`.

Retry: backoff, máx. 5. `error_code` sanitizado. Sem token no erro.

## Webhook

`/api/webhooks/whatsapp` — assinatura obrigatória. Dedupe `notification_webhook_events (provider, event_id)`.

Inbound `SIM` ligado a retorno ativo → `cliente_respondeu_sim` (**não** cria horário).

## Cron

`/api/cron/retention` Bearer `CRON_SECRET`. **PRODUCTION: DISABLED.**

Job força `dry_run` no planejamento de retornos. Sem `setInterval` no processo web.

## SERVICE_READY

Oficina/lava: finalizar → `pronto_para_entrega`. Entrega é ação à parte (`entregue`).

Temas sensíveis (estética/odonto) usam template privado na régua de retorno.

## Envs (nomes)

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

1. `WHATSAPP_ENABLED=false` e `EMAIL_ENABLED=false`
2. Não cadastrar cron na Vercel
3. Tenant: desligar preferências em Configurações → Comunicações
