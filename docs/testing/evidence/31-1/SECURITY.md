# Sprint 31.1 — SECURITY

## Controles ativos

- Tokens só em SecureStore
- Bearer API sem service role
- Membership/tenant validados server-side
- Logs sanitizados
- Recovery com mensagem neutra
- Deep links allowlisted
- Biometria opt-in, não substitui auth
- Offline read-only + TTL
- Produção rejeita tokens `mock.*`

## Threat model

Ver `docs/security/MOBILE_THREAT_MODEL.md` (atualizado 31.1)
