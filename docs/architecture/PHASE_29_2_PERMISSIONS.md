# Fase 29.2 — Escalabilidade Enterprise e Otimização de Permissões

**Sprint:** 29.2  
**Pré-requisito:** Sprint 29.1  
**Escopo:** reduzir round-trips de permissões; cache por request; batch — sem mudar regras, DB ou KPIs

---

## Sistemas de autorização (não unificar)

| Sistema | Uso | Otimização 29.2 |
|---------|-----|-----------------|
| `lib/permissoes` (`tenant_role_permissions`) | Oficina / OS / mecânicos / descontos | `hasMany` + `loadPermissionMap` (React.cache) |
| Enterprise RBAC (`lib/enterprise` adapters) | Finance / CRM enterprise | `resolveFinancePageAuth` cacheado |
| Tax page-auth | Tributário | `resolveTaxPageAuth` cacheado |
| Sidebar / menus | Estáticos (`config/navigation`) | Sem queries de permissão (inalterado) |

---

## Entregas

1. `PermissionService.loadRolePermissions()` — 1 query por role na instância  
2. `hasMany` / `requireAll` — batch sobre o mapa  
3. `lib/permissoes/authorization.ts` — `loadPermissionMap`, `tryResolvePermissions`, `getPermission`  
4. Pages migradas: OS detalhe/lista/nova, mecânicos, centro-ops, descontos  
5. Finance + Tax page-auth com `React.cache`  
6. Guards mecânicos via `getPermission` (cache compartilhado)

---

## Comportamento preservado

- Fallback `DEFAULT_ROLE_PERMISSIONS` quando não há linha / erro de query  
- Middleware continua só sessão/membership (sem checagem de keys)  
- Sidebar **não** filtra por permissão (evita mudança de UX)

---

## Gate

```bash
npm run lint
npm run build
npm run test:phase29
npm run test:release-candidate
```

Evidências: `docs/testing/evidence/29-2/`

## Backlog 29.3+

- Filtrar sidebar com mapa em cache (se produto quiser ocultar links)  
- Cache de `resolveAuthorizationSnapshot` no adapter enterprise (compartilhar Finance/CRM/Tax)  
- Migrar demais actions (`ordens/actions`, `operacoes/*`) para `requirePermissionKeys`
