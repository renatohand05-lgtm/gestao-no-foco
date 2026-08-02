# Fase 29.8 — Enterprise Release Audit, Homologação Visual e Pré-Deploy

**Sprint:** 29.8  
**Pré-requisito:** 29.0–29.7  
**Classificação:** RELEASE ENTERPRISE APROVADA COM RESSALVAS

Evidências: [docs/testing/evidence/29-8/](../testing/evidence/29-8/)

- [BASELINE.md](../testing/evidence/29-8/BASELINE.md)
- [BROWSER_QA_MATRIX.md](../testing/evidence/29-8/BROWSER_QA_MATRIX.md)
- [REPORT.md](../testing/evidence/29-8/REPORT.md)

## Correções de regressão (gates)

- `scripts/rbac-tests.mjs` — barrel `components/security` removido
- `scripts/finance-core-tests.mjs` — imports deep (evita grafo intelligence no Node)
- `lib/dashboard/ops-executive-intelligence.ts` — imports relativos

## Gate

```bash
npm run lint
npm run build
npm run test:phase29
npm run test:release-candidate
npm run test:rbac
npm run test:finance-core
# + crm/supply/inventory/analytics/intelligence-contracts
node scripts/homolog-29-8-browser.mjs
```
