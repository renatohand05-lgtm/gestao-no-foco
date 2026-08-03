# Mobile Session Lifecycle

## Boot
1. Load SecureStore session
2. If online → `getSession` / refresh single-flight
3. Resolve state: unauthenticated | authenticated_without_tenant | authenticated_without_branch | authenticated | offline_limited | expired | revoked | error

## Login
`signInWithPassword` → persist tokens → optional biometric setup → tenant selector

## Refresh
`refreshSessionOnce` — single-flight; on failure → expired/revoked

## Logout
API best-effort + `signOut` + clear SecureStore + clear tenant/branch + QueryClient.clear → login

## Offline limited
Requires prior valid session + lastValidatedAt within TTL + tenant metadata. Read-only shell only.
