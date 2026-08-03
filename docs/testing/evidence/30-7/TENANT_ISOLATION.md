# Sprint 30.7 — Tenant isolation

- `simulateRule`: ctx.tenantId ≠ rule.tenantId → risco cross-tenant
- `runAutomationEngine`: `errorCode CROSS_TENANT`
- Migration RLS: policies filtram `tenant_members`

Suite: `npm run test:phase30-automation-tenant-isolation`
