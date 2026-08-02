# Lighthouse / Web Vitals — Sprint 29.9

| Campo | Valor |
|-------|--------|
| Base URL | http://localhost:3001 |
| Auth file | true |
| PASS | 9 |
| FAIL | 0 |

## Runs

| Rota | Form | Auth | Source | Perf | A11y | LCP(ms) | CLS | FCP(ms) | TTFB(ms) |
|------|------|------|--------|------|------|---------|-----|---------|----------|
| /login | desktop | false | LH | 0.72 | 0.95 | 8267 | 0.000 | 1061 | 15 |
| /login | mobile | false | LH | 0.76 | 0.95 | 8488 | 0.000 | 1059 | 4 |
| /teste-renato-01/dashboard | desktop | true | PerformanceAPI | - | - | - | 0.000 | 1560 | 1249 |
| /teste-renato-01/crm | desktop | true | PerformanceAPI | - | - | - | 0.000 | 452 | 284 |
| /teste-renato-01/financeiro | desktop | true | PerformanceAPI | - | - | - | 0.000 | 456 | 274 |
| /teste-renato-01/analytics | desktop | true | PerformanceAPI | - | - | - | 0.000 | 500 | 335 |
| /teste-renato-01/financeiro/dre | desktop | true | PerformanceAPI | - | - | - | 0.000 | 492 | 321 |
| /teste-renato-01/dashboard | mobile | true | PerformanceAPI | - | - | - | 0.000 | 428 | 274 |

## Limitações

- Lighthouse auth cookie header falhou (code=1): pode redirecionar para login
- INP não disponível via Lighthouse aggregate nesta versão em todos os runs; TBT usado quando presente.
- Scores Lighthouse em rotas autenticadas dependem de cookie injection; Performance API é a fonte confiável quando LH redireciona.
