# WhatsApp Cloud API — setup (Sprint 35.2.2)

Homologação **não** é automática. Renato decide quando ligar.

## Envs (somente nomes)

`WHATSAPP_ENABLED`  
`WHATSAPP_PROVIDER`  
`WHATSAPP_ACCESS_TOKEN`  
`WHATSAPP_PHONE_NUMBER_ID`  
`WHATSAPP_BUSINESS_ACCOUNT_ID`  
`WHATSAPP_WEBHOOK_VERIFY_TOKEN`  
`WHATSAPP_APP_SECRET`

Nunca `NEXT_PUBLIC_*` para token. Nunca persistir no banco. Nunca logar.

## Passos (ambiente controlado)

1. App Meta + WhatsApp Cloud no **número de teste**.
2. Webhook: `GET/POST /api/webhooks/whatsapp`
   - Verify token = `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - Assinatura `x-hub-signature-256` com `WHATSAPP_APP_SECRET`
3. `WHATSAPP_PROVIDER=meta_cloud` e **só então** `WHATSAPP_ENABLED=true`
4. Enviar 1 agendamento + 1 SERVICE_READY para o número autorizado
5. Confirmar `SENT` / `DELIVERED` na outbox
6. Voltar kill switch a `false` se não for go-live

## Kill switch

Ausente ou `false` → mesmo com credenciais, o factory efetivo é `dry_run`.  
`MANUAL_LINK` (wa.me) continua disponível.

## Rollback

`WHATSAPP_ENABLED=false`. Outbox permanece auditável. Cron continua DISABLED.
