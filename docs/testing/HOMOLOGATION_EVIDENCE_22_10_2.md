# Homologação RC — Evidência Sprint 22.10.2

**Produto:** Import Intelligence + Conciliação  
**Data/hora (UTC):** 2026-07-29T12:22–12:25 approx  
**Ambiente:** working tree local (Node/Next build + suítes automatizadas)  
**Classificação:** **APROVADO COM RESSALVAS**

---

## Escopo executado nesta sprint

1. Leitura do checklist, RC doc e operations guide  
2. Confirmação de que Sprint 22.10.1 permanece no working tree  
3. Homologação **estrutural/código** + suíte `test:homologation-rc` (72 PASS)  
4. Gate completo lint/build + todas as suítes RC (0 FAIL)  
5. Correção documental (RC doc ainda citava memória silenciosa em Vendas/OS)  
6. **Não** executado: browser smoke com tenants reais no Supabase staging (requer credenciais/ambiente humano)

---

## Gates automatizados

| Comando | PASS | FAIL |
|---------|------|------|
| `npm run lint` | OK (0 errors) | 0 |
| `npm run build` (+ TypeScript) | OK | 0 |
| `test:import-engine` | 179 | 0 |
| `test:finance-core` | 53 | 0 |
| `test:treasury-experience` | 239 | 0 |
| `test:cash-intelligence` | 82 | 0 |
| `test:bank-reconciliation` | 28 | 0 |
| `test:financial-intelligence` | 64 | 0 |
| `test:document-connectors` | 57 | 0 |
| `test:intelligence-experience` | 106 | 0 |
| `test:release-candidate` | 64 | 0 |
| `test:rc-corrections` | 68 | 0 |
| `test:homologation-rc` | 72 | 0 |

**Total suítes: 1012 PASS · 0 FAIL**

---

## Matriz (checklist → resultado)

| Área | Cenário | Resultado | Evidência | Correção | Status |
|------|---------|----------|-----------|----------|--------|
| Prep | Docs + migrations + 22.10.1 no tree | PASS | homologation-rc | Doc RC atualizado (Vendas/OS) | OK |
| Flags | Todas off por default | PASS | getEnterpriseFeatureFlags | — | OK |
| RBAC pages | `/integracoes/*`, importar, caixa, conciliação | PASS | requireTenant / requireFinancePagePermission | — | OK |
| RBAC finance | `financeiro.criar` no import | PASS | import-actions.ts | — | OK |
| DRE | Detecção + grupos + label original | PASS | interpretDreLines | — | OK |
| Folha | Confirmação + PII mask | PASS | interpretPayrollRows | — | OK |
| Segurança | exe/CSV/XXE/prompt/PDF corrupt | PASS | security + parsers | — | OK |
| OFX | FITID duplicado | PASS | parseOfxBuffer | — | OK |
| Baixa confiança | Sem silent confirm | PASS | assertNoSilentLowConfidenceConfirm | — | OK |
| Duplicidade | Isolamento tenant | PASS | assessDuplicate | — | OK |
| Transferência | Impacto consolidado 0 | PASS | transferConsolidatedNetImpact | — | OK |
| Conciliação | Sem fallback / sem demo fake | PASS | create-reconciliation + UI | — | OK |
| Conectores | Preparing + indisponível | PASS | registry + hub UI | — | OK |
| Memória | Bloqueio produção | PASS | memory-policy | — | OK |
| Vendas/OS | Staging explícito | PASS | sales/os actions | — | OK |
| Falha parcial | Mensagem + rollback attempt | PASS | import-actions | — | OK |
| A11y/resp | focus-visible, tablist, overflow | PASS | hub-nav | — | OK |
| Smoke browser Owner/Admin/Financeiro/RO | **NÃO EXECUTADO** | Staging humano | — | RESSALVA |
| Migrations aplicadas no Supabase staging | **NÃO VERIFICADO** | Manual | — | RESSALVA |
| Volume ≥5000 linhas UI | **NÃO EXECUTADO** | Staging | — | RESSALVA |
| Fila `/revisar` com linhas live | **Limitação conhecida** | Empty state honesto; fila no wizard | — | RESSALVA |

---

## Problemas encontrados

| # | Problema | Severidade | Ação |
|---|----------|------------|------|
| 1 | RC doc ainda dizia que Vendas/OS usam memory engine silenciosa | Doc | Corrigido em `IMPORT_INTELLIGENCE_RC_22_10.md` |
| 2 | Ops `docs/operations/` pode estar desatualizado vs architecture | Doc | Architecture atualizado (ALLOW_IMPORT_MEMORY); sync ops recomendado no commit |
| 3 | Homologação browser/staging com tenants reais não disponível neste agente | Processo | Smoke restante listado abaixo |
| 4 | `/integracoes/revisar` não carrega fila persistida global | Produto conhecido | Empty state honesto; revisão no wizard de importação |

**Problemas corrigidos nesta sprint:** #1 (documentação).  
**Não corrigidos (fora de escopo / dependem de staging):** #3, #4 (limitação documentada).

---

## Riscos restantes

1. Smoke manual em staging ainda obrigatório antes de produção  
2. Confirmar RLS/migrations no projeto Supabase alvo  
3. Fila de revisão global ainda não persistida  
4. Webhook idempotency in-memory (só com flag on)  
5. Staging Vendas/OS sem entidades de domínio  

---

## Ações manuais no Supabase

1. Confirmar aplicação de `20260809_enterprise_import_intelligence.sql`  
2. Confirmar aplicação de `20260810_enterprise_bank_reconciliation.sql`  
3. **Não** há SQL novo nesta sprint  

## Variáveis (.env staging)

Ver `.env.example` — manter flags `IMPORT_*` / `WEBHOOK_*` / `ALLOW_IMPORT_MEMORY` em `0`.

---

## Smoke tests restantes (humano)

- [ ] Login Owner/Admin/Financeiro/Read-only em staging  
- [ ] Import Excel financeiro completo até commit + histórico + rollback  
- [ ] OFX → bank_statement_lines → conciliação com confirmação  
- [ ] Cross-tenant: usuário B sem ver dados A  
- [ ] Upload .exe / CSV `=cmd` / PDF imagem na UI  
- [ ] Conectores: botões disabled, nenhum “Conectado”  
- [ ] Responsividade visual tablet/mobile  

---

## Recomendação final

### **APROVADO COM RESSALVAS**

**Aprovado para:** commit do working tree e smoke em **staging** (não produção).  

**Ressalvas bloqueadoras de produção (não de commit):**  
- completar smoke browser no checklist  
- confirmar migrations no Supabase de staging  

**Não classificado como APROVADO PARA COMMIT E STAGING puro** porque o checklist exige evidência manual de perfis/tenants reais — aqui coberta de forma estrutural + gates 0 FAIL.

**Interpretação prática:** engenharia pode **commitar** o RC após revisão humana do diff; **staging smoke** deve fechar as ressalvas antes de tag/deploy.

---

## Confirmações

- Lint/build/TypeScript OK · 0 FAIL em todas as suítes exigidas (+ homologation-rc)  
- Nenhuma migration antiga alterada · nenhum SQL executado  
- Nenhum git add/commit/push/merge/tag/deploy  
- Working tree preservado para revisão humana  
