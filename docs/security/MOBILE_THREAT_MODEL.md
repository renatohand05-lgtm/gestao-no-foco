# Mobile Threat Model (Sprint 31.1)

## Ameaças e mitigações

| Ameaça | Mitigação 31.1 | Status |
|--------|----------------|--------|
| Token theft | SecureStore only; never logs; production rejects mock.* | Ativo |
| Lost device | Logout limpa sessão + SecureStore + cache | Ativo |
| Rooted device | Adapter futuro | Planejado |
| Intercepted traffic | HTTPS API + Supabase; pinning futuro | Parcial |
| Malicious deep link | Allowlist `gof://auth/*`; guards | Ativo |
| Tenant leakage | Memberships API + clear on switch + query keys | Ativo |
| Branch leakage | Membership check; continue-without-branch explícito | Ativo |
| Cache leakage | AsyncStorage só prefs; tokens fora | Ativo |
| Screenshot | Privacy screen futuro — **não alegado ativo** | Planejado |
| Log leakage | `sanitizeForLog` / logger sanitizado | Ativo |
| Offline tampering | Read-only; TTL; sem mutações | Ativo |
| Password recovery abuse | Mensagem neutra; token não logado | Ativo |
| Biometric bypass | Opt-in; não substitui auth server | Ativo |
| Service role exposure | Ausente no mobile e nas rotas Bearer | Ativo |

## Não afirmar

SSL pinning, jailbreak detection ou screenshot block até implementados.
