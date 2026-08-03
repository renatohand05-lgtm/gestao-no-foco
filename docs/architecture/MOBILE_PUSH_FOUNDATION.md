# Mobile Push Foundation

## Escopo 31.0

Contratos apenas:

- device registration
- push token
- preferences / categories
- routing / deep links
- mark as read / revoke

## Garantias

- `permissionRequested: false`
- `tokenRegistered: false`
- `providerConfigured: false`
- Sem solicitar permissão no boot
- Sem enviar push
- Sem provider externo configurado

`expo-notifications` instalado como preparação — **não ativado**.
