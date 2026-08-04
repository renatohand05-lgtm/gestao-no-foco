# Sprint 31.5 — CHECKLIST Estoque / Compras Mobile

## Regras

- [x] Sem novas regras/cálculos de negócio
- [x] Sem alterar RBAC / Multi Tenant / Segurança / Estoque / Compras / Financeiro (web)
- [x] Sem commit / push / deploy / EAS / SQL / migrations

## Entregas

- [x] BASELINE.md
- [x] APIs `/estoque/*` (11 rotas incl. compras/:id)
- [x] Compose reutiliza services Web
- [x] Dashboard mobile + KPIs + alertas + quick actions
- [x] Produtos lista + detalhe + infinite scroll
- [x] Movimentações (entrada/saída/ajuste)
- [x] Inventário resumo
- [x] Compras lista + detalhe
- [x] Fornecedores
- [x] Alertas + reposição (API)
- [x] Offline snapshot home RO
- [x] React Query staleTime 60s
- [x] Testes estáticos + homolog-31-5
- [x] Docs architecture + evidence

## Gates

- [x] homolog-31-5 — 8 PASS
- [x] mobile lint / typecheck / test
- [x] lint root (0 errors)
- [x] test:rbac — 92 PASS
- [x] test:release-candidate — 65 PASS
- [ ] Expo Doctor 20/20 — **19/20** (drift deps pré-existente gesture-handler / patch Expo)
- [x] build — 0 (rotas estoque presentes)

## QA device

- [ ] Android homologado — NÃO
- [ ] iOS preparado — PARCIAL (código Expo)
- [ ] Viewports 375/390/430/tablet dark/light — NÃO (sem device)
