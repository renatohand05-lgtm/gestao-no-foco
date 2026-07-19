# Gate 2 — Relatório formal NF-e 13.22

**Veredicto: READY**

---

## 1. Migration remota

| Item | Status |
|------|--------|
| `20260725_nfe_entrada_importacao.sql` | Aplicada (antes) |
| `20260725_nfe_processar_rpc.sql` | Aplicada (CTO) |
| Tabelas / índices / bucket / RLS | OK |
| RPC `processar_nfe_entrada_atomico` | OK (responde P0001 sem auth) |

`npm run audit:nfe` → **PASS=36 FAIL=0 READY**

---

## 2. Política de custo

- Estoque → médio ponderado
- OS → custo real NF
- Misto → só parcela estoque no médio
- Documentado em `docs/architecture/NFE_IMPORTACAO_13_22.md`

---

## 3. Atomicidade

RPC transacional única: estoque + custo + OS + CP opcional + status + eventos. Idempotente. Sem service role no client.

---

## 4. Testes

| Comando | Resultado |
|---------|-----------|
| `npm run audit:nfe` | PASS=36 FAIL=0 |
| `npm run audit:schema -- --live` | OK |
| `npm run test:nfe-gate2` | **PASS=30 FAIL=0** |
| Lint + build (#30) | PASS |

Evidência: `docs/testing/evidence/13-22/GATE2_30_TESTES.json`

Auth live: sessão Playwright (`docs/testing/playwright/.auth/user.json`).

---

## 5. Riscos restantes (não bloqueantes)

- Multi-OS por item = evolução futura
- Regenerar `types/database.ts` quando conveniente
- Sessão Playwright precisa renovar com `npm run test:login` se expirar

---

## 6. Decisão

**READY** para auditoria formal do CTO.

Não iniciado 13.23. Sem commit / push / PR nesta entrega.
