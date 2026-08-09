# Sprint 31.11.1 — EAS_AUTH

## Resultado

**EAS autenticado: NÃO**

- Conta: não disponível nesta sessão
- Token de ambiente: não configurado
- Token/senha: **não solicitados nem gravados**

## Como autenticar (manual, no seu terminal)

Opção A — login interativo:

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest whoami
```

Opção B — CI / token (não versionar):

1. Criar token em https://expo.dev/settings/access-tokens
2. No terminal da sessão apenas: `$env:EXPO_TOKEN="…"` (PowerShell)
3. Não colar o token no chat, no Git ou em docs

Depois:

```bash
npx eas-cli@latest project:info
```

Se não houver projeto vinculado, **não** criar com `eas init` sem autorização explícita.
