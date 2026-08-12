# Arquitetura multiempresa — mapa real (Sprint 33.2)

## Modelo encontrado

```
auth.users
  └── profiles (opcional UI)
  └── tenant_members (user_id, tenant_id, role)
        └── tenants (id, name, slug, segment, …)
```

**URL = contexto ativo:** `/{tenantSlug}/…`  
**Lista autorizada:** `getUserTenants()` / `getUserTenantSlugs()` via memberships.  
**Gates:** middleware (slug ∉ memberships → redirect) + `requireTenant` (server).

```
USUÁRIO
├── EMPRESA A (tenant) ← membership role
│     └── (sem filiais operacionais de produto no Portal)
└── EMPRESA B
```

Não foi criada arquitetura paralela: memberships já resolvem multiempresa.

## Filiais

Não há seletor de filial operacional no Portal web. Mobile pode ter stub; **não alterar mobile** nesta sprint.

## Cache tenant-scoped

- Dashboard filters: `gnf:dashboard-filters:{slug}` (legado sem slug invalidado)
- Troca de empresa: `clearTenantScopedClientCaches` + `router.refresh()`
- Cookie: `gof_last_tenant_slug` (somente slugs autorizados no cold start)

## Observabilidade

- `tenant_access_denied` / `tenant_context_denied` (logger sanitizado)
- Header `x-request-id` no middleware quando sessão Supabase ativa
