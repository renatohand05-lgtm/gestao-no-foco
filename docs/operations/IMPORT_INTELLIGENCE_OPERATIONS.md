# Import Intelligence — Operations Guide

**Sprint:** 22.6–22.10  
**Audiência:** DevOps, SRE, engenharia backend  
**Última atualização:** 2026-07-29

---

## 1. Visão geral da arquitetura

```
Upload / API / Webhook / Clipboard
        ↓
  validateImportFileSecurity
        ↓
  detectFormat → parseImportFile (CSV/Excel/PDF/OFX/XML)
        ↓
  Assisted Intelligence (detect → classify → review)
        ↓
  Mapping + Preview + Commit (adapter por módulo)
        ↓
  Persistência Supabase (import_runs, profiles, learning, rollback)
        ↓
  [Financeiro] bank_statement_lines → Conciliação
```

Motor único em `lib/import-engine/`. Conciliação em `lib/finance/reconciliation/`. Sem engines paralelas.

---

## 2. Providers (Assisted Intelligence)

| Provider | ID | Quando ativo |
|----------|-----|--------------|
| Determinístico | `deterministic` | Default — regras + histórico tenant |
| Mock | `mock` | Apenas testes (`mode: "mock"`) |
| Externo | `external-stub` | Só com credenciais + flag; implementação real ainda stub |

Factory: `createFinancialIntelligenceProvider()` em `assisted-intelligence/create-provider.ts`.

Prioridade de classificação (`classification-priority.ts`):

1. Regra confirmada do tenant  
2. Perfil de importação  
3. Histórico do tenant  
4. Provider (nunca sobrescreve regra confirmada silenciosamente)

---

## 3. Formatos suportados

| Formato | Parser | Notas |
|---------|--------|-------|
| CSV | `csv-parser.ts` | CSV injection sanitizado |
| Excel (.xlsx/.xls) | `excel-parser.ts` | Heurística macro Office |
| PDF texto | `pdf-parser.ts` | Image-only rejeitado sem OCR |
| OFX | `ofx-parser.ts` | Extrato bancário |
| XML financeiro | `xml-finance-parser.ts` | Anti-XXE |
| Clipboard | `clipboard-input.ts` | Tabela/CSV/JSON/texto |
| CNAB | `cnab-contract.ts` | **Preparing** — não parsear |

---

## 4. Segurança

- **Upload:** `lib/import-engine/security/file-security.ts`
- **Antivírus:** placeholder no-op (`security/antivirus.ts`)
- **Prompt injection:** `assisted-intelligence/prompt-injection.ts`
- **Webhook:** HMAC-SHA256, timestamp ±300s, idempotency key obrigatória
- **API:** Bearer `IMPORT_API_KEY`, header `X-Tenant-Id`, rate limit in-memory
- **Erros cliente:** `toSafeClientMessage()` — sem stack traces

---

## 5. Confiança e revisão humana

- Badges: `components/import-engine/confidence-badge.tsx`
- Fila revisão: `/[tenant]/integracoes/revisar`
- Thresholds: `assisted-intelligence/confidence.ts`
- Explicações: `assisted-intelligence/explanation.ts`, `suggestion-explanation-panel.tsx`

Baixa confiança → fila humana; nunca auto-confirma silenciosamente.

---

## 6. Aprendizado (learning)

- Store Supabase: `import_learning_rules` (migration 20260809)
- Aplicação: `learning/apply-learning.ts`
- Maturidade: `assisted-intelligence/learning-maturity.ts`
- Isolamento: regras sempre scoped por `tenant_id`

---

## 7. Duplicidade

- Motor: `assisted-intelligence/duplicates.ts`
- Compara por tenant; external_id, hash, fingerprint
- Verdicts expostos na UI — **nunca exclui silenciosamente**

---

## 8. Rollback

- Core: `rollback/rollback-store.ts` + `supabase-rollback-store.ts`
- Financeiro: `rollbackFinanceImport` reverte movimentações via estorno
- Vendas/OS: staging-only — rollback marca run, sem dados definitivos

Actions: `prepareImportRollback`, `executeImportRollback` em `intelligence-actions.ts`.

---

## 9. Conciliação bancária

- Factory produção: `createProductionReconciliationService(client)`
- Tabelas: migration `20260810_enterprise_bank_reconciliation.sql`
- Import extrato → `persistStatementLinesFromFinanceImport`
- UI: `components/finance/cash-intelligence/reconciliation-client.tsx`
- **Sem fallback silencioso para memória em produção**

---

## 10. Conectores

Registry: `connectors/registry.ts` — todos `preparing`.

| ID | Categoria |
|----|-----------|
| `rest_api` | REST |
| `webhook` | Webhook |
| `erp_omie`, `erp_conta_azul`, `erp_bling` | ERP |
| `banking_open_finance` | Banking |
| `sales_channel`, `service_orders_channel` | Canais |

Hub UI: `/[tenant]/integracoes/conectores`

Endpoints (desabilitados por default):

- `POST /api/webhooks/import`
- `POST /api/v1/import`

---

## 11. Variáveis de ambiente

| Variável | Default | Descrição |
|----------|---------|-----------|
| `IMPORT_EXTERNAL_AI_ENABLED` | off | Provider IA externo |
| `IMPORT_OCR_ENABLED` | off | OCR para PDF image-only |
| `IMPORT_CNAB_ENABLED` | off | Parser CNAB (quando existir) |
| `IMPORT_CONNECTORS_ENABLED` | off | Conectores específicos live |
| `WEBHOOK_IMPORT_ENABLED` | off | Endpoint webhook |
| `IMPORT_AUTO_SYNC_ENABLED` | off | Sync automático |
| `IMPORT_API_ENABLED` | off | API REST import |
| `IMPORT_API_KEY` | — | Bearer token API (≥16 chars) |
| `WEBHOOK_CONNECTOR_{ID}_TENANT` | — | Tenant UUID por conector |
| `WEBHOOK_CONNECTOR_{ID}_SECRET` | — | HMAC secret por conector |

Valores truthy: `1`, `true`, `yes`, `on` (case insensitive).

---

## 12. Feature flags

Centralizadas em `lib/import-engine/enterprise-feature-flags.ts`.

```typescript
getEnterpriseFeatureFlags()
// → { externalAi, ocr, cnab, connectorsSpecific, webhooks, autoSync, importApi }
```

Todas default **false**. Não habilitar em produção sem homologação.

---

## 13. Migrações Supabase

| Arquivo | Sprint | Conteúdo |
|---------|--------|----------|
| `20260809_enterprise_import_intelligence.sql` | 22.6 | Import runs, profiles, learning, run items, rollback, RLS |
| `20260810_enterprise_bank_reconciliation.sql` | 22.6.2 | Sessions, statement lines, matches, RLS |

**Aplicar manualmente** no Supabase SQL Editor/CLI. Não executadas automaticamente pelo deploy.

**Sprint 22.10:** nenhuma migration nova.

---

## 14. Comandos de teste

```bash
npm run test:release-candidate    # Gate RC 22.10
npm run test:import-engine        # Motor + persistência
npm run test:bank-reconciliation  # Conciliação
npm run test:document-connectors  # Parsers + webhook + flags
npm run test:financial-intelligence
npm run test:intelligence-experience
npm run test:rbac
npm run test:audit
```

---

## 15. Limitações conhecidas

1. CNAB, OCR, conectores ERP/banco — preparing  
2. Antivírus real não integrado  
3. Webhook/API aceitam request mas pipeline assíncrono completo em preparação  
4. Vendas/OS staging em memória — persistência Supabase pendente  
5. Idempotency webhook/API — cache in-memory (não distribuído)  
6. Provider IA externo — stub mesmo com credenciais  
7. `createImportEngine()` sem client ainda usa memória (dev/test only)

---

## 16. Runbook rápido

| Sintoma | Verificar |
|---------|-----------|
| Import não persiste histórico | Migration 20260809 aplicada? RLS? Usar path produção (`createProductionImportEngine`) |
| Conciliação vazia | Migration 20260810? `bank_statement_lines` populada pós-import OFX? |
| Webhook 503 | `WEBHOOK_IMPORT_ENABLED=1` + credenciais conector |
| PDF rejeitado | Texto pesquisável vs image-only; flag OCR |
| Classificação sempre determinística | Expected — external AI off |

Documentação RC: [`IMPORT_INTELLIGENCE_RC_22_10.md`](./IMPORT_INTELLIGENCE_RC_22_10.md)  
Homologação: [`../testing/HOMOLOGATION_CHECKLIST_22_10.md`](../testing/HOMOLOGATION_CHECKLIST_22_10.md)
