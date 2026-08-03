# Mobile Tenant / Branch Context

## Tenant
- Source: `GET /api/mobile/v1/memberships` (Bearer)
- Persist last authorized tenant id in SecureStore metadata
- Switch: clear QueryClient, reload permissions, reset branch

## Branch
- Source: `GET /api/mobile/v1/tenants/:id/branches`
- Current platform: no filiais table → `{ items: [], allowContinueWithoutBranch: true }`
- User may continue without branch when allowed
- Backend always re-validates membership for tenantId

## Isolation
- Query keys include tenantId + branchId
- Client never trusts storage alone without revalidation when online
