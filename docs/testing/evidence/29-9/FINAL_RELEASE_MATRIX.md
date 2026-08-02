# Final Release Matrix — Sprint 29.9

**Checkpoint:** `92f1f13`  
**Classificação:** LIBERADO COM RESSALVAS NÃO BLOQUEANTES  
**Push / Deploy / Tag nesta execução:** NÃO / NÃO / NÃO  

| Área | Status | PASS | FAIL | Evidência | Notas |
|------|--------|------|------|-----------|-------|
| Checkpoint git | OK | — | — | git log/status | HEAD=92f1f13 · ahead 1 |
| next start | APROVADO | 10 | 0 | `next-start/` | porta 3001 · localhost |
| CRUD CRM | RESSALVA | 10 | 0 | `crud-crm/` | create bloqueado por schema |
| Kanban | APROVADO | 5 | 0 | `kanban/` | DnD + refresh OK |
| Vendas/Orçamento | APROVADO* | 7 | 0 | `vendas-orcamento/` | *probe de form; create full N/A |
| OS | APROVADO* | 6 | 0 | `ordens/` | *detalhe sem botões no estado |
| Compras | RESSALVA | 5 | 0 | `compras/` | schema pendente na UI |
| Estoque | APROVADO | 4 | 0 | `estoque/` | form movimentação OK |
| Agenda | APROVADO | 8 | 0 | `agenda/` | create + views + mobile |
| Exportações | APROVADO* | 7 | 0 | `exports/` | DRE CSV/XLSX reais; demais não inventados |
| Lighthouse/Web Vitals | APROVADO* | 9 | 0 | `lighthouse/` | *auth via Performance API |
| RBAC multi-perfil | LIMITADO | 17 | 0 | `rbac/` | só Owner; limitação documentada |
| Console/Network | APROVADO | 4 | 0 | `console-network/` | 0×500 · 0 UUID · 0 pageerror |
| lint | APROVADO | — | 0 | `next-start/lint.log` | 0 erros |
| build | APROVADO | — | 0 | `next-start/build.log` | EXIT 0 |
| test:phase29 | APROVADO | 206 | 0 | `next-start/phase29.log` | |
| test:release-candidate | APROVADO | 64 | 0 | `next-start/rc.log` | |
| test:rbac | APROVADO | — | 0 | `next-start/test-rbac.log` | |
| test:finance-core | APROVADO | — | 0 | `next-start/test-finance-core.log` | |
| test:crm-core | APROVADO | — | 0 | `next-start/test-crm-core.log` | |
| test:supply-core | APROVADO | — | 0 | `next-start/test-supply-core.log` | |
| test:inventory-core | APROVADO | — | 0 | `next-start/test-inventory-core.log` | |
| test:analytics-core | APROVADO | — | 0 | `next-start/test-analytics-core.log` | |
| test:intelligence-contracts | APROVADO | — | 0 | `next-start/test-intelligence-contracts.log` | |

## Totais browser 29.9

| Métrica | Valor |
|---------|-------|
| PASS | 83 |
| FAIL | 0 |
| Screenshots | 44 |
| Lighthouse suite PASS/FAIL | 9 / 0 |

## Liberação

| Item | Pronto? |
|------|---------|
| Push | SIM (ressalvas) |
| Deploy | NÃO |
| Tag | NÃO |
| Fase 30 | SIM |

## Ressalvas obrigatórias no aceite

1. Migrations CRM/compras pendentes no ambiente local de homologação  
2. RBAC multi-perfil não exercitado além de Owner  
3. Exportações afirmadas apenas onde download real ocorreu (DRE)  
4. CRUD mutacional completo de venda/OS/compras permanece backlog operacional
