# Sprint 31.3 — CHECKLIST

## Entrega

- [x] API summary / AP / AR / cash-flow / DRE / approvals / detail
- [x] Home financeira mobile
- [x] Contas a pagar / receber
- [x] Fluxo de caixa (lista)
- [x] DRE resumido
- [x] Aprovações (parcial → web)
- [x] Offline summary read-only
- [x] RBAC canônico
- [x] Docs arquitetura + evidência
- [x] Suites `test:phase31-finance-*` + `test:homolog-31-3`
- [ ] Device QA Android
- [ ] Device QA iOS
- [ ] Commit (proibido nesta sprint por pedido)

## Gates (sessão)

| Gate | Resultado |
|------|-----------|
| `test:homolog-31-3` | 11 PASS · 0 FAIL |
| `mobile:typecheck` | PASS |
| `mobile:lint` | PASS |
| `mobile:doctor` | 20/20 PASS |
| `mobile:test` | 2 PASS · 0 FAIL |
| `tsc` (web) | PASS |
| `lint` (root) | PASS (0 errors; warnings pré-existentes em scripts) |
| `build` | PASS |
| `test:rbac` | 92 PASS · 0 FAIL |
| `test:release-candidate` | 65 PASS · 0 FAIL |
| `test:phase31-dashboard-mobile` | 15 PASS |
| `test:phase31-mobile-auth` | 12 PASS |
| `test:phase31-mobile-tenant-isolation` | 6 PASS |
