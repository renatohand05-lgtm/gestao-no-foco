# Checkpoint 31.9-release — SECURITY

**Data:** 2026-08-04

## Controles validados (estático + suites)

| Controle | Status |
|----------|--------|
| Bearer nas APIs mobile | SIM (`authenticateMobileRequest`) |
| Membership + tenant | SIM |
| RBAC server-side (inteligência, campo, busca) | SIM |
| SecureStore sessão mobile | SIM (padrão existente) |
| Search: sanitização ILIKE + limit 50 | SIM |
| Search: tipos filtrados por permissão | SIM |
| Uploads OS via rotas autenticadas | SIM |
| URLs assinadas (galeria) | SIM (serviço canônico) |
| Scanner: sem auto-ação crítica | SIM (confirmação) |
| Deep links: allowlist + bloqueio externo | SIM |
| Favoritos/recentes isolados user/tenant/filial | SIM |
| Offline limitado (leitura/cache) | SIM |
| Service role no app mobile | NÃO observado |
| Tokens em URL/log | NÃO observado no escopo |
| Arquivos sensíveis no working tree do escopo | NÃO |

## Ressalvas

- Device QA (câmera/scanner) não executado
- Smoke autenticado profundo de módulos Web depende de sessão de produção
