# Phase 31.9 — Mobile Productivity

Arquitetura centralizada em `apps/mobile/src/productivity/` + API `GET /api/mobile/v1/tenants/:tenantId/search`.

## Módulos

| Pasta/arquivo | Responsabilidade |
|---------------|------------------|
| `search-compose.ts` (server) | Busca global RBAC via MasterData + OS/veículos |
| `commands.ts` | Command palette + perfil adaptativo |
| `storage.ts` | Favoritos/recentes locais (user/tenant/branch) |
| `search-cache.ts` | Último resultado seguro offline |
| `scanner.ts` | Interpretação QR/código (sem auto-ação) |
| `deep-links.ts` | Allowlist `gof://` / paths internos |
| `context-actions.ts` | Ações por tela |
| `productivity-strip.tsx` | Bloco na home |

## Princípios

- Sem novas regras de negócio
- Sem duplicar services de domínio
- Sem IA generativa
- Sem migration para favoritos
- Mutações sensíveis continuam nas rotas existentes / portal

## Fluxos

1. Busca → debounce → API → agrupa → detalhe / favorito
2. Scanner → permissão → leitura → busca → **confirmação** → navega
3. Comandos → filtro + RBAC → navega / ação de conta
4. Logout / troca empresa → limpa caches de produtividade do escopo
