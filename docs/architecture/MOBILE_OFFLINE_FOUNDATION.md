# Mobile Offline Foundation

## Escopo 31.0

- Network status (`expo-network`)
- Contratos: `OfflineFoundation`, `SyncStatus`
- UI: online / offline / stale messaging
- **Read-only** offline · mutações financeiras **proibidas**
- Sem sync de módulos reais
- Sem falsa “sincronização concluída”

## Contratos futuros

- mutation queue
- conflict resolution
- background sync adapter
- encrypted cache

## Garantias

`mutationsAllowedOffline: false`
`financialMutationsOffline: false`
`readOnlyOffline: true`
