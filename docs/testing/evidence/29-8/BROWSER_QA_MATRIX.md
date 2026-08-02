# Browser QA Matrix — Sprint 29.8

| Campo | Valor |
|-------|--------|
| Tenant | `teste-renato-01` |
| Base URL | `http://localhost:3000` |
| Auth | storageState `docs/testing/playwright/.auth/user.json` — **sessão autenticada OK** |
| Script | `scripts/homolog-29-8-browser.mjs` |
| PASS checks | 35 |
| FAIL checks | 1 (timeout frio `/tributario` — **revalidado 200** em retry) |
| Screenshots | 34 + 1 retry tributário |
| Console errors capturados | 0 |
| UUID hits (amostra body) | 0 |

## Rotas autenticadas (dark desktop)

| Rota | Status | OK | Shot |
|------|--------|----|------|
| /dashboard | 200 | PASS | screenshots/dashboard-dark-desktop.png |
| /clientes | 200 | PASS | screenshots/clientes-dark-desktop.png |
| /produtos | 200 | PASS | screenshots/produtos-dark-desktop.png |
| /produtos/servicos | 200 | PASS | screenshots/servicos-dark-desktop.png |
| /vendas | 200 | PASS | screenshots/vendas-dark-desktop.png |
| /vendas/nova | 200 | PASS | screenshots/vendas-nova-dark-desktop.png |
| /ordens | 200 | PASS | screenshots/ordens-dark-desktop.png |
| /ordens/nova | 200 | PASS | screenshots/ordens-nova-dark-desktop.png |
| /crm | 200 | PASS | screenshots/crm-dark-desktop.png |
| /crm/leads | 200 | PASS | screenshots/crm-leads-dark-desktop.png |
| /crm/oportunidades | 200 | PASS | screenshots/crm-oportunidades-dark-desktop.png |
| /compras | 200 | PASS | screenshots/compras-dark-desktop.png |
| /estoque | 200 | PASS | screenshots/estoque-dark-desktop.png |
| /agenda | 200 | PASS | screenshots/agenda-dark-desktop.png |
| /financeiro | 200 | PASS | screenshots/financeiro-dark-desktop.png |
| /financeiro/orcamento | 200 | PASS | screenshots/orcamento-dark-desktop.png |
| /financeiro/dre | 200 | PASS | screenshots/dre-dark-desktop.png |
| /financeiro/cfo | 200 | PASS | screenshots/cfo-dark-desktop.png |
| /analytics | 200 | PASS | screenshots/analytics-dark-desktop.png |
| /inteligencia | 200 | PASS | screenshots/inteligencia-dark-desktop.png |
| /tributario | 200 (retry) | PASS* | screenshots/tributario-dark-desktop-retry.png |
| /configuracoes/metas | 200 | PASS | screenshots/metas-dark-desktop.png |
| /configuracoes | 200 | PASS | screenshots/configuracoes-dark-desktop.png |

\* Timeout 120s no primeiro `goto` (compile a frio do `npm run dev`); retry com 180s → **200**.

## Temas / viewports amostrados

| Rota | Theme | Viewport | OK |
|------|-------|----------|----|
| /dashboard | light | desktop | PASS |
| /financeiro/dre | light | desktop | PASS |
| /crm | light | desktop | PASS |
| /inteligencia | light | desktop | PASS |
| /dashboard | dark | notebook/tablet/mobile | PASS |
| /financeiro/dre | dark | notebook/tablet/mobile | PASS |

## Públicas

| Rota | Status | OK |
|------|--------|----|
| / | 200 | PASS |
| /login | 200 | PASS |

## Observações

- Não aceito redirect `/login` como homologação autenticada — rotas tenant permaneceram autenticadas.
- CRUD profundo (criar lead, Kanban drag, export CSV, RBAC multi-perfil no browser) **não** esgotado nesta rodada automatizada.
- Lighthouse / Web Vitals numéricos **não executados** (sem score inventado).
