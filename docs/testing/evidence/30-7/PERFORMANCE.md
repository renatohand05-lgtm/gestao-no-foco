# Sprint 30.7 — Performance

Metas browser QA (`homolog-30-7-browser.mjs`):

| Métrica | Alvo | Medido (prod local :3007) |
|---------|------|---------------------------|
| Cold (desktop) | ≤ 2500 ms | **834 ms** |
| Warm reload | ≤ 1200 ms | **759 ms** |

Otimizações: probe de schema em `Promise.all` + cache TTL 60s; store em memória sem bloquear Dashboard; lazy tabs no client.

Rota: `/{tenant}/automacoes` · tenant `teste-renato-01`.

Evidência: `browser-qa.json`, `browser-run.log`, screenshots em `screenshots/`.
