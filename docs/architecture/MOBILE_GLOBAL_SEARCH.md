# Mobile Global Search

## Endpoint

`GET /api/mobile/v1/tenants/:tenantId/search`

Params: `q` (min 2), `types`, `limit` (max 50), `cursor`, `branchId`.

Auth: Bearer + membership + `resolveMobilePermissions`.

## Compose

`lib/mobile/search-compose.ts` reutiliza `MasterDataSearchService` e consultas limitadas de OS/veículos com `tenant_id` e sanitização ILIKE.

DTO: `id`, `type`, `title`, `subtitle`, `status`, `route`, `opensWeb`, `permission`, `updatedAt`.

Tipos sem permissão são omitidos.

## Cliente

`fetchMobileSearch` + tela `/busca` com debounce, `useDeferredValue`, AbortSignal, React Query, cache local offline (somente leitura).
