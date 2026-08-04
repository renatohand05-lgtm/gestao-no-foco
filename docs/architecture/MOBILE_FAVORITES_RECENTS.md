# Mobile Favorites & Recents

Armazenamento **local** AsyncStorage (sem migration):

- `@gof/prod/recent/{userId}/{tenantId}/{branch}`
- `@gof/prod/favorites/{userId}/{tenantId}/{branch}`

Metadados mínimos: id, type, title, subtitle, route, opensWeb, at/order.

Limites: 20 recentes, 24 favoritos. Título truncado 80 chars.

Logout e troca de empresa limpam o escopo atual (`clearProductivityCaches`).
