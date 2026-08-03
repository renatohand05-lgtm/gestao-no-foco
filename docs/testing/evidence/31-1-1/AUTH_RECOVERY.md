# Sprint 31.1.1 — AUTH_RECOVERY

## Implementação (código)

| Item | Status |
|------|--------|
| Tela `/(auth)/recover` | Presente |
| `resetPasswordForEmail` + `redirectTo: gof://auth/reset` | Presente |
| Mensagem neutra pós-envio | Presente (“Verifique sua caixa de entrada…”) |
| Tela `/(auth)/reset` | Presente |
| Parse tokens de hash/query sem log | Presente |
| Validação senha forte (schema) | Presente |
| Suites `test:phase31-mobile-password-recovery` / deep-links | PASS |

## Supabase Redirect URLs

Checklist manual (Dashboard → Authentication → URL Configuration):

- [ ] `gof://auth/reset`
- [ ] `gof://auth/callback`

Guia: `docs/architecture/MOBILE_SUPABASE_REDIRECT_URLS.md`
**Agent não alterou Supabase remoto.**

## Homologação E2E

| Cenário | Resultado |
|---------|-----------|
| Solicitar recovery (contrato) | PASS estático |
| E-mail inexistente vs existente (enumeração) | Código alinhado a mensagem neutra; E2E não rodado |
| Abrir deep link no Android | **Não** (sem device) |
| Token válido / expirado / replay | **Não** E2E |
| Rate limit visual | Parcial (UI de loading; sem teste de throttle real) |

**Recovery homologado: PARCIAL**
