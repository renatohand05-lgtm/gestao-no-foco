# 31.11.4 — Correção Bundle JavaScript iOS

## Classificação

**CORREÇÃO APROVADA** (com ressalva de variáveis EAS para runtime, não para o crash do bundle)

Nova build EAS: **NÃO executada** (conforme escopo).

---

## 1. Causa exata

Metro falhou ao fazer `JSON.parse` de `packages/schemas/package.json` porque o arquivo tinha **UTF-8 BOM** (`EF BB BF`).

Mensagem real (reproduzida com `npx expo export --platform ios --clear`):

```
SyntaxError: Unexpected token '', "{
    "n"... is not valid JSON

Import stack:
 apps/mobile/app/(auth)/recover.tsx
 | import "@gof/schemas"
```

A mensagem EAS “Unknown error” na fase Bundle JavaScript mascarava este SyntaxError.

## 2. Arquivo e linha

| Item | Valor |
|------|--------|
| Arquivo gatilho | `packages/schemas/package.json` (BOM no byte 0) |
| Import de entrada | `apps/mobile/app/(auth)/recover.tsx` → `import "@gof/schemas"` |
| Módulo | `@gof/schemas` |
| Também afetados (mesmo BOM) | 12 outros `package.json`/`tsconfig.json` em `packages/*` |

## 3. Correção realizada

1. Remoção do BOM UTF-8 em 13 arquivos sob `packages/` (UTF-8 sem BOM).
2. Criado `apps/mobile/.easignore` (exclui `docs/`, caches Next, artifacts; preserva mobile + packages + lockfiles).
3. Removidos `eas.json` e `app.json` **indevidos na raiz** (fonte de verdade: `apps/mobile/`).
4. `apps/mobile/babel.config.js`: removido plugin deprecado `expo-router/babel` (já coberto por `babel-preset-expo`).

Sem alteração de funcionalidade de negócio, RBAC, projectId, credenciais Apple ou nova build.

## 4. Variáveis EAS necessárias (ambiente `preview`)

O crash **não** foi por env ausente. Para runtime do app após a próxima build, cadastrar no EAS (preview) — **somente nomes**:

| Nome | Visibilidade | Obrigatório bundle? | Obrigatório auth/API em runtime? |
|------|--------------|---------------------|----------------------------------|
| `EXPO_PUBLIC_APP_ENV` | Plain text | Não (já vem do `eas.json` = `preview`) | Recomendado |
| `EXPO_PUBLIC_API_BASE_URL` | Plain text | Não | Sim (chamadas API) |
| `EXPO_PUBLIC_SUPABASE_URL` | Plain text | Não | Sim (login) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Sensitive (ou Plain text se política do time) | Não | Sim (login) |

Não cadastrar: service role, secrets de servidor, Apple keys no env do app.

**Ação do usuário:** no dashboard Expo → Project → Environment variables → environment **preview**, cadastrar os três `EXPO_PUBLIC_*` de API/Supabase com os valores de produção/homolog desejados. Não foram cadastrados automaticamente nesta sprint.

## 5–12. Checklist do sprint

| # | Item | Resultado |
|---|------|-----------|
| 5 | `expo export` iOS | **PASS** |
| 6 | Expo Doctor 20/20 | **SIM** |
| 7 | Gates 0 FAIL | **SIM** |
| 8 | Tamanho anterior do archive | **343 MB** |
| 9 | Tamanho estimado após `.easignore` | **~15–40 MB** (exclusão principal: `docs/` ~207 MB + caches Next; não medido com upload real) |
| 10 | Projeto EAS | `@rfranco300/gestao-no-foco` / `51b0c195-feec-4ac1-9fe6-a001d9571bb4` |
| 11 | Nova build executada | **NÃO** |
| 12 | Pronto para repetir build iOS | **SIM** |

### Gates executados

| Gate | Resultado |
|------|-----------|
| `mobile:doctor` | 20/20 |
| `mobile:lint` | PASS |
| `mobile:typecheck` | PASS |
| `mobile:test` | 2/2 PASS |
| `lint` | PASS |
| `build` (Next.js) | PASS |
| `test:release-candidate` | 65 PASS · 0 FAIL |
| `test:rbac` | 92 PASS · 0 FAIL |
| `test:homolog-31-10` | 3 PASS · 0 FAIL |
| `test:homolog-31-11` | 1 PASS · 0 FAIL |

### Config validada (sem nova build)

- owner: `rfranco300`
- projectId: `51b0c195-feec-4ac1-9fe6-a001d9571bb4`
- bundle: `com.gestaonofoco.app`
- version: `1.10.0` / buildNumber `110`
- runtimeVersion policy: `appVersion`
- profile `preview` em `apps/mobile/eas.json` (internal)
- Credenciais Apple / device / profiles: **não recriados**

---

## Próximo passo (usuário)

1. (Opcional) Cadastrar `EXPO_PUBLIC_*` no ambiente preview do EAS.
2. Rodar **manualmente**:

```powershell
cd apps/mobile
npx eas-cli@latest build --platform ios --profile preview
```

3. Reutilizar certificado, provisioning e iPhone já registrados (não gerar novos sem necessidade).

Commit / push / deploy: **não feitos**.
