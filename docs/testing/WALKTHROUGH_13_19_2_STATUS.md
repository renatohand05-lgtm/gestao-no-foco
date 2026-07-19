# Walkthrough Oficina 13.19.2 — Status de execução

**Data:** 2026-07-16  
**Sprint 13.20:** não iniciada

## Resultado

| Item | Status |
|---|---|
| Automação UI (Playwright) | **Pronta** — `npm run test:walkthrough` |
| Execução E2E completa nesta sessão | **Bloqueada** — sem sessão no Chromium isolado |
| Validação técnica (schema/lint/build) | **Verde** (exit 0) |

## Causa do bloqueio

O Playwright usa um **Chromium isolado** (`docs/testing/playwright/user-data`).  
Ele **não compartilha** cookies com o Chrome/Edge onde você já está logado em `localhost:3000`.

Verificação: `auth cookies: []` no perfil Playwright após tentativas.

Tentativas realizadas:
- 3 execuções de `npm run test:walkthrough`
- Janela Chromium com espera de 5 min para login manual
- Perfil persistente criado em `docs/testing/playwright/user-data`

## Como concluir o walkthrough

1. Terminal A: `npm run dev` (porta 3000)
2. Terminal B — **capturar sessão (uma vez):**

```powershell
cd c:\Users\renat\gestao-no-foco
npm run test:login
```

Faça login na janela do Chromium. O script aguarda **indefinidamente** e salva `docs/testing/playwright/.auth/user.json`.

3. Terminal B — **executar walkthrough:**

```powershell
npm run test:walkthrough
```

O walkthrough reutiliza automaticamente `user.json`. Evidências em `docs/testing/evidence/13-19-2/` + `*_report.json`.

### Alternativa (sem janela)

Defina no ambiente antes de rodar:

```powershell
$env:WALKTHROUGH_EMAIL="seu-email-de-teste"
$env:WALKTHROUGH_PASSWORD="sua-senha"
npm run test:walkthrough
```

## O que o script valida automaticamente

- UI: 26 passos do roteiro manual
- Banco (via cookie Supabase): `veiculo_id`, `venda_id`, itens, retorno, CR única, OS única por venda
- Screenshots por etapa (sem dados pessoais)

## Evidências parciais desta sessão

- `docs/testing/evidence/13-19-2/2026-07-16T17-29-53-648Z_01-auth.png` — tela de login (sem sessão)

## Próximo passo para o CTO

Executar `npm run test:walkthrough` com login concluído e anexar o `*_report.json` gerado.
