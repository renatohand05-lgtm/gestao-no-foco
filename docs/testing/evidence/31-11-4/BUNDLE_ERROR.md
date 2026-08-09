# 31.11.4 — Bundle JavaScript error

## Build

| Campo | Valor |
|-------|--------|
| Build ID | `373a6b9a-cb44-4173-a1f9-a11311c89fdb` |
| URL | https://expo.dev/accounts/rfranco300/projects/gestao-no-foco/builds/373a6b9a-cb44-4173-a1f9-a11311c89fdb |
| Status EAS | `ERRORED` |
| Fase | Bundle JavaScript |
| Mensagem genérica EAS | `Unknown error. See logs of the Bundle JavaScript build phase` |
| Profile | `preview` (internal) |
| Archive | 343 MB |

## Reprodução local

```bash
cd apps/mobile
npx expo export --platform ios --clear
```

### Erro real (primeira falha)

```
SyntaxError: Unexpected token '', "{
    "n"... is not valid JSON

Import stack:

 apps/mobile/app/(auth)/recover.tsx
 | import "@gof/schemas"

 apps/mobile/app (require.context)
```

- **Arquivo raiz da falha:** `packages/schemas/package.json`
- **Módulo:** `@gof/schemas` (resolvido via Metro a partir de `recover.tsx` / auth)
- **Tipo:** Metro / `JSON.parse` ao ler `package.json` do workspace
- **Causa:** UTF-8 **BOM** (`EF BB BF`) no início do `package.json` — o token `` quebra o parse
- **Não é:** variável ausente, TypeScript, import `next/*`, ou falha de credencial Apple

## Arquivos com o mesmo defeito (BOM)

Confirmados com leitura dos 3 primeiros bytes `239,187,191`:

- `packages/schemas/package.json` ← gatilho direto do stack
- `packages/schemas/tsconfig.json`
- `packages/api-contracts/package.json` + `tsconfig.json`
- `packages/config/package.json` + `tsconfig.json`
- `packages/design-tokens/package.json`
- `packages/domain/package.json` + `tsconfig.json`
- `packages/rbac-contracts/package.json` + `tsconfig.json`
- `packages/utils/package.json` + `tsconfig.json`

## Correção aplicada

Remoção do BOM UTF-8 (reescrever UTF-8 sem BOM) nos 13 arquivos acima.

## Observações colaterais (não causa do crash)

- Archive 343 MB: `docs/` (~207 MB) não estava excluído no upload; `.easignore` criado.
- `eas.json` e `app.json` indevidos na raiz do monorepo (auditoria) — removidos; fonte de verdade: `apps/mobile/`.
- Deprecation: `expo-router/babel` em `babel.config.js` (removido; preset Expo já cobre).
- Env preview EAS sem `EXPO_PUBLIC_*` cadastradas: schemas tratam URL/key como opcionais no parse; **não** causou este SyntaxError (runtime auth pode precisar delas depois).
