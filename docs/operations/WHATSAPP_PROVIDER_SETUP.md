# WhatsApp Cloud API — setup (Sprint 35.2.2 + 35.3.1)

Homologação real usa `COMMUNICATION_MODE=test` + allowlist. **Não** ligar `live`.

## Envs (somente nomes)

- `COMMUNICATION_MODE`
- `COMMUNICATION_TEST_ALLOWLIST`
- `WHATSAPP_ENABLED`
- `WHATSAPP_PROVIDER`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID` (opcional; não usado no send/webhook)
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`

Nunca `NEXT_PUBLIC_*` para token. Nunca persistir no banco. Nunca logar.

## Passos (ambiente controlado)

1. App Meta + WhatsApp Cloud no **número de teste**.
2. Webhook: `GET/POST /api/webhooks/whatsapp`
   - Verify token = `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - Assinatura `x-hub-signature-256` com `WHATSAPP_APP_SECRET`
3. `COMMUNICATION_MODE=test` e `COMMUNICATION_TEST_ALLOWLIST` com o destinatário autorizado
4. `WHATSAPP_ENABLED=true` (se `WHATSAPP_PROVIDER` estiver vazio, o runtime usa Meta Cloud; `dry_run` explícito continua vencendo)
5. Enviar 1 agendamento + 1 SERVICE_READY para o número autorizado
6. Confirmar `sent` na outbox. `delivered` só com webhook real.
7. Manter kill switch `false` se não for o tenant de teste

## Kill switch

Ausente ou `false` → mesmo com credenciais, o factory efetivo é `dry_run`.  
`MANUAL_LINK` (wa.me) continua disponível.

## Rollback

`WHATSAPP_ENABLED=false`. Outbox permanece auditável. Cron continua DISABLED. `COMMUNICATION_MODE` permanece `test`.
