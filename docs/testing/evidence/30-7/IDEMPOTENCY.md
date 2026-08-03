# Sprint 30.7 — Idempotency

Fonte: `lib/automacoes/idempotency.ts`.

- `buildIdempotencyKey(tenantId:ruleId:trigger:entity:windowBucket)`
- `findDuplicateExecution` ignora falhas; dedupe em completed/executing/queued/waiting_approval
- Unique DB: `(tenant_id, idempotency_key)`

Suite: `npm run test:phase30-automation-idempotency`
