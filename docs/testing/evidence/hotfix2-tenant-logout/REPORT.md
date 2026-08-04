# Hotfix 2 — Seletor + Logout

## Produção (pré-correção)

Alias `https://gestao-no-foco.vercel.app` → deployment com **Commit `20821bc`**.
Nesse commit, `DropdownMenuLabel` ainda era `MenuPrimitive.GroupLabel`.
Não havia SW/PWA cacheando JS antigo; a falha era render client → error boundary.

## Base UI error #31 (significado literal)

Base UI exige que partes de **grupo** do Menu (`GroupLabel`, etc.) existam dentro de `<Menu.Group>` ou `<Menu.RadioGroup>`.
Usar `GroupLabel` fora desse contexto lança:

`Base UI: MenuGroupContext is missing. Menu group parts must be used within <Menu.Group> or <Menu.RadioGroup>.`

## Causa raiz

`components/ui/dropdown-menu.tsx` mapeava `DropdownMenuLabel` → `MenuPrimitive.GroupLabel` sem exigir `DropdownMenuGroup` nos call sites.

## Por que seletor e avatar falhavam juntos

Ambos renderizam `<DropdownMenuLabel>` ao **abrir** o menu (cabeçalho “Empresas” / nome+email). O crash ocorria no open, antes de navegar ou de `signOut`.

## Correção

1. `DropdownMenuLabel` → `<div role="presentation">` (cabeçalho visual).
2. `RouteError` → log só `digest` + nome sanitizado (sem stack/PII na UI).
3. `/manifest.webmanifest` liberado no `proxy` matcher + early-return no middleware (antes: 307 → `/login`).

## Removido (não publicar)

- `app/inspecao/debug-menu` (rota temporária de diagnóstico)
- `scripts/hotfix2-*` (scripts exclusivos de investigação)

Inspeção pública legítima permanece em `app/(public)/inspecao/[token]`.

## Manifest (pós-fix, `next start` :3010)

- HTTP **200**
- `Content-Type: application/manifest+json`
- JSON válido
- Sem redirect para `/login`

## Gates (última execução)

| Gate | Resultado |
|------|-----------|
| hotfix static | 27 PASS · 0 FAIL |
| mobile auth contracts | 26 PASS |
| RBAC | 92 PASS |
| mobile tenant isolation | 6 PASS |
| tsc | 0 |
| lint | 0 (warnings pré-existentes) |
| build | 0 |

Smoke autenticado completo (`smoke-final.json`, `next start` :3010):

| Passo | Resultado |
|-------|-----------|
| open-switcher (sem Base UI #31) | PASS |
| open-avatar-menu | PASS |
| logout → `/login` | PASS |
| rota protegida bloqueada | PASS |
| re-login manual | PASS |
| `/manifest.webmanifest` 200 + `application/manifest+json` | PASS |
