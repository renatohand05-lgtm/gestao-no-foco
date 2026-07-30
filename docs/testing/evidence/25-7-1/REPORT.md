# Sprint 25.7.1 — Correção urgente CssSyntaxError · Relatório

**Classificação:** **APROVADO EM RUNTIME**  
**Data:** 2026-07-30  
**URL validada:** http://localhost:3001/teste-renato-01/dashboard  
**Evidências:** `docs/testing/evidence/25-7-1/`

---

## Causa raiz exata

O overlay `Build Error / CssSyntaxError` em `./app/globals.css:1:1` **não era sintaxe CSS inválida**.

Mensagem real do runtime:

```text
CssSyntaxError: tailwindcss: .../app/globals.css:1:1:
  .../package.json (directory description file):
  SyntaxError: Unexpected end of JSON input
```

### Mecanismo

1. Stack: **Next.js 16.2.10** + **Tailwind CSS 4.3.2** + **`@tailwindcss/postcss` 4.3.2**.
2. `globals.css` usava imports bare:
   - `@import "tailwindcss";`
   - `@import "tw-animate-css";`
   - `@import "shadcn/tailwind.css";`
3. Ao resolver esses packages, o PostCSS/Tailwind 4 lê o **`package.json` da raiz** como *directory description file*.
4. Em Windows, com `next dev` + Turbopack ativos, edições não atômicas / leituras transitórias do `package.json` (truncado/vazio) fazem o parse JSON falhar.
5. O erro é **reembalado** como `CssSyntaxError` apontando para `globals.css:1:1`, mascarando a causa.

O CSS de tokens/motion da Sprint 25.7 estava **válido** (chaves balanceadas; PostCSS isolado processava com sucesso quando `package.json` estava íntegro).

### Bloco responsável (antes)

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
```

Linha 1 do arquivo — ponto de entrada do import que dispara a resolução.

---

## Correção aplicada

1. **Imports explícitos** em `app/globals.css` (mesmos assets, sem bare resolve na raiz):

```css
@import "../node_modules/tailwindcss/index.css";
@import "../node_modules/tw-animate-css/dist/tw-animate.css";
@import "../node_modules/shadcn/dist/tailwind.css";
```

2. **`scripts/assert-package-json.mjs`** + `predev` / `dev` validam `package.json` antes de subir o Next.
3. **`npm run test:global-css`** processa o mesmo `globals.css` via PostCSS real e valida JSON do `package.json`.
4. Limpeza de **`.next`**, servidor único em **3001**, reinício limpo validado **duas vezes**.

### Tokens preservados

`--surface-*`, `--border-premium`, `--motion-*`, `--glow-gold`, `--ease-premium`, temas claro/escuro, brand gold/navy, `.premium-enter`, chart motion — **intactos**.

---

## Servidor validado

| Campo | Valor |
|-------|--------|
| Comando | `npm run dev -- --port 3001` |
| PID (ciclo 2) | `36560` |
| Porta | `3001` |
| URL | http://localhost:3001 |
| Dashboard | http://localhost:3001/teste-renato-01/dashboard |
| CssSyntaxError no log (pós-fix) | **0 hits** |
| Overlay Build Error | **ausente** |

---

## Navegador / console

| Página | Status | Overlay | React |
|--------|--------|---------|-------|
| `/` | 200 | não | sim (hero) |
| `/login` | 200 | não | sim |
| `/teste-renato-01/dashboard` dark | 200 | não | `data-dashboard-premium-v257` + 6 KPIs |
| dashboard light | 200 | não | sim |

### Warnings não fatais (pré-existentes)

- Chave React duplicada: `/teste-renato-01/analytics/relatorios` na sidebar.
- Hydration mismatch no `ThemeToggle` (ícone sol/lua) — regenera no client; **não bloqueia** o dashboard.

**Sem** `CssSyntaxError` / `Build Error` no console após o fix.

---

## Testes (0 FAIL)

| Comando | Resultado |
|---------|-----------|
| `test:global-css` | 27 PASS · 0 FAIL |
| `lint` | OK |
| `build` (após limpar `.next`) | OK |
| `test:motion-system` | 19 PASS |
| `test:premium-interactions` | 12 PASS |
| `test:design-system-final` | 24 PASS |
| `test:visual-consistency` | 10 PASS |
| `test:premium-loader` | 44 PASS |
| `test:revenue-chart-labels` | 48 PASS |
| `test:dashboard-layout-final` | 33 PASS |
| `test:kpi-no-truncation` | 15 PASS |
| `test:no-horizontal-overflow` | 11 PASS |
| `test:dashboard-premium` | 31 PASS |
| `test:visual-contract` | 31 PASS |
| `test:release-candidate` | 64 PASS |

**Total FAIL do gate: 0**

---

## Evidências

Pasta `docs/testing/evidence/25-7-1/`:

- `landing-1440.png`, `login-1440.png`, `loader-or-early.png`
- `dashboard-1440-dark.png`, `dashboard-1440-light.png`
- `command-center-open.png`, `business-health.png`, `decision-center.png`, `simulator.png`
- `runtime-report.json`
- `globals-css-head.txt` (trecho corrigido)
- `server-startup.txt` / `server-terminal.txt`

---

## Arquivos alterados / criados

**Alterados**

- `app/globals.css` — imports explícitos (DS preservado)
- `package.json` — `test:global-css`, `predev`, `dev` com assert
- `scripts/global-css-tests.mjs`

**Criados**

- `scripts/assert-package-json.mjs`
- `scripts/capture-25-7-1-runtime.mjs`
- `docs/testing/evidence/25-7-1/*`

---

## Limitações restantes

1. Evitar editar `package.json` com `next dev` aberto (mesmo com imports explícitos, outras ferramentas ainda leem o arquivo).
2. Warning de key duplicada na nav Analytics e hydration do ThemeToggle — fora do escopo desta correção urgente.
3. Labels fixos do gráfico (`data-revenue-label`) podem ser 0 no viewport capturado se o chart ainda anima/carrega; cockpit e KPIs renderizaram.

---

## Confirmações

- Nenhuma regra de negócio / cálculo alterado  
- Design System + motion 25.7 preservados  
- Logo / RBAC / tenant isolation preservados  
- Sem migration / SQL  
- Sem git add / commit / push / deploy  

---

## Classificação final

### APROVADO EM RUNTIME

Dashboard abre de verdade após reinicialização limpa, sem overlay `CssSyntaxError`, com `CssHits=0` no servidor e evidências Playwright.
