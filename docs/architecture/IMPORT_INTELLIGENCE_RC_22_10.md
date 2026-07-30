# Import Intelligence — Release Candidate 22.10

**Sprint:** 22.10 — Release Candidate, Security and Production Prep  
**Escopo:** Import Engine Enterprise, Assisted Intelligence, Conciliação Bancária, Conectores  
**Data:** 2026-07-29

---

## 1. Architecture Audit

### 1.1 Motor único — sem engines paralelas

| Área | Decisão |
|------|---------|
| Parsing | `lib/import-engine/parsers/*` — único pipeline via `parseImportFile` |
| Classificação | `assisted-intelligence/*` — provider único via `createFinancialIntelligenceProvider` |
| Persistência import | `createProductionImportEngine` → adapters Supabase (histórico, mapping, learning, rollback) |
| Conciliação | `createProductionReconciliationService` → `supabase-reconciliation-repository` |
| Commit financeiro | `lib/finance/import/import-actions.ts` delega a Finance Core existente |

Não existem engines paralelas de importação ou conciliação. Vendas/OS usam o mesmo motor com adapters (`adapters/sales`, `adapters/service-orders`); staging em memória é explícito e documentado.

### 1.2 Dependências circulares — notas

| Relação | Status | Nota |
|---------|--------|------|
| `import-engine` → `finance` | OK unidirecional | Actions financeiras importam engine; engine não importa finance domain |
| `import-engine/intelligence` → `finance/import` (rollback) | OK lazy | `executeImportRollback` faz dynamic import só para módulo financeiro |
| `finance/cash-intelligence` → `reconciliation` | OK | Conciliação é submódulo finance |
| `components/import-engine` → `lib/import-engine` | OK | UI consome lib, nunca o inverso |

**Risco residual (LOW):** adapters Vendas/OS usam `createProductionImportEngine` para histórico/mapeamento; staging de linhas confirmadas permanece memória **explícita** até ligação aos services de domínio (sem criar vendas/OS reais).

### 1.3 Lista de reutilização (reuse)

| Componente existente | Reutilizado por |
|---------------------|-----------------|
| `ImportEngineService` | Financeiro, Vendas, OS |
| `validateImportFileSecurity` | Todos os uploads |
| `createSupabaseFinanceCore` | Commit de movimentações |
| `requireTenant` + RBAC Enterprise | Todas as páginas `/integracoes` e server actions |
| `createProductionReconciliationService` | Cash Intelligence actions |
| `enterprise-feature-flags.ts` | OCR, CNAB, webhooks, API, auto-sync, external AI |
| `webhook-security.ts` | `/api/webhooks/import` |
| `api-contract.ts` | `/api/v1/import` |

### 1.4 Placeholders conhecidos (não habilitados por default)

| Item | Local | Comportamento |
|------|-------|---------------|
| CNAB 240/400 | `parsers/cnab-contract.ts` | Status `preparing`; extensões `.ret/.rem/.cnab` rejeitadas ou mensagem amigável |
| OCR PDF image-only | `parsers/pdf-text-extractor.ts` | Rejeita parse sem `IMPORT_OCR_ENABLED` |
| Antivírus | `security/antivirus.ts` | `NoopAntivirusScanner` — heurística local apenas |
| Provider IA externa | `assisted-intelligence/external-provider-stub.ts` | Fallback determinístico; nunca simula resposta de IA |
| Conectores ERP/banco | `connectors/registry.ts` | Todos `status: "preparing"` |
| Webhook import | `app/api/webhooks/import/route.ts` | Flag `WEBHOOK_IMPORT_ENABLED` off → 503 preparing |
| API REST import | `app/api/v1/import/route.ts` | Flag `IMPORT_API_ENABLED` off → 503 preparing |
| Auto-sync | feature flag only | Sem cron/worker ativo |

### 1.5 Memory stores — uso permitido vs proibido

| Store | Produção | Testes / dev |
|-------|----------|--------------|
| `createProductionImportEngine` | **Supabase only** — lança se client ausente | N/A |
| `createImportEngine` (legacy) | **Não usar em Server Actions** — fallback memória quando client omitido ou Supabase falha | Wizard local, scripts de teste |
| `createProductionReconciliationService` | **Supabase only** | N/A |
| `createReconciliationBackend({ backend: "memory" })` | **Não** | `bank-reconciliation-tests.mjs` |
| Staging Vendas/OS | Memória global explícita | Documentado em adapters |
| Webhook idempotency cache | In-memory TTL 24h | `resetWebhookIdempotencyCache()` em testes |

### 1.6 Spot-check produção — findings (Sprint 22.10)

| Path | Finding | Ação |
|------|---------|------|
| `create-reconciliation.ts` | ✅ `createProductionReconciliationService` exige client; sem catch→memory | Nenhuma — conforme |
| `create-import-engine.ts` | ⚠️ `createImportEngine(client)` fazia catch→memory silencioso | **Corrigido:** `createProductionImportEngine` sem fallback; actions de produção migradas |
| `import-actions.ts` | Usava `createImportEngine` | **Corrigido:** usa `createProductionImportEngine` |
| `intelligence-actions.ts` | Usava `createImportEngine` | **Corrigido:** usa `createProductionImportEngine` |
| Vendas/OS adapters | Histórico/mapeamento Supabase; staging memória **explícito** | Documentado — sem entidades de domínio reais |

**Conciliação:** erros de persistência propagam ao caller; não há degradação silenciosa para memória quando client Supabase é fornecido.

**Import Engine produção:** erros de persistência Supabase propagam; wizard/dev pode continuar usando `createImportEngine()` sem client.

### 1.7 Migrações

| Migration | Conteúdo |
|-----------|----------|
| `20260809_enterprise_import_intelligence.sql` | `import_runs`, `import_profiles`, `import_learning_rules`, `import_run_items`, rollback events, RLS |
| `20260810_enterprise_bank_reconciliation.sql` | `bank_reconciliation_sessions`, `bank_statement_lines`, matches, RLS |

**Nova migration Sprint 22.10:** **NÃO criada.** Schema existente cobre persistência RC; alterações foram apenas em código TypeScript e documentação.

---

## 2. Security Checklist (RC)

| # | Controle | Status | Evidência |
|---|----------|--------|-----------|
| S1 | Feature flags default `false` | ✅ | `enterprise-feature-flags.ts`, `test:release-candidate` |
| S2 | Sem stack trace em respostas cliente | ✅ | `toSafeClientMessage()` |
| S3 | Upload: whitelist extensão + MIME + magic bytes | ✅ | `file-security.ts` |
| S4 | CSV injection neutralizada | ✅ | `csv-security.ts` |
| S5 | XML bomb / XXE bloqueado | ✅ | `xml-finance-parser.ts` |
| S6 | Prompt injection tratado como dado | ✅ | `prompt-injection.ts` |
| S7 | Webhook: HMAC + timestamp skew + idempotency | ✅ | `webhook-security.ts` |
| S8 | Tenant nunca confiado só do payload webhook | ✅ | `resolveTenantFromConnector` + `assertTenantIsolation` |
| S9 | API import: bearer token + rate limit | ✅ | `api-contract.ts` |
| S10 | RBAC `requireTenant` em `/integracoes` | ✅ | Todas as pages (exceto redirect financeiro) |
| S11 | Finance import exige `financeiro.criar` | ✅ | `import-actions.ts` |
| S12 | Conectores não simulam sync ativo | ✅ | Registry `preparing` |
| S13 | Observabilidade sem PII/credenciais/conteúdo | ✅ | `import-events.ts` + `sanitizeImportEventPayload` |
| S14 | Provider externo sem credenciais → determinístico | ✅ | `external-provider-stub.ts` |
| S15 | Conciliação sem fallback silencioso memória | ✅ | `create-reconciliation.ts` |

Detalhamento operacional e homologação manual: [`docs/testing/HOMOLOGATION_CHECKLIST_22_10.md`](../testing/HOMOLOGATION_CHECKLIST_22_10.md).

---

## 3. Error Taxonomy

Implementado em `lib/import-engine/errors/enterprise-import-errors.ts`.

| Categoria | Exemplos |
|-----------|----------|
| `user` | Cancelamento pelo operador |
| `validation` | Mapeamento incompleto, idempotency duplicada |
| `permission` | RBAC negado, tenant mismatch |
| `file` | Extensão bloqueada, tamanho excedido |
| `provider` | IA externa indisponível/mal configurada |
| `persistence` | Falha Supabase em run/histórico |
| `integration` | Webhook/API em preparing, auth falhou |
| `temporary` | Rate limit, indisponibilidade transitória |
| `internal` | Erro não classificado — mensagem genérica ao cliente |

`toSafeClientMessage()` nunca retorna stack traces nem detalhes de infraestrutura.

---

## 4. Observability

Implementado em `lib/import-engine/observability/import-events.ts`.

Eventos: upload, detect, parse, classify, review, confirm, error, rollback, reconciliation, sync, webhook, api, provider.

**Proibido logar:** conteúdo integral de documentos, tokens, credenciais, PII desnecessária, dados bancários sensíveis (números de conta, linhas de extrato completas).

---

## 5. Test Gates

```bash
npm run test:release-candidate
npm run test:import-engine
npm run test:bank-reconciliation
npm run test:document-connectors
```

---

## 6. RC Readiness Note

> **Recomendação:** **Aprovado para Release Candidate** (gates automatizados 22.7–22.10 com 0 FAIL).  
> **Condições residuais obrigatórias antes de produção:** homologação manual (`docs/testing/HOMOLOGATION_CHECKLIST_22_10.md`), smoke em staging com tenants reais, confirmação de RLS/migrations `20260809` e `20260810` aplicadas no ambiente alvo, e feature flags mantidas off até credenciais/contratos reais (IA externa, OCR, CNAB, webhooks, sync automático, API import).

**Estado do código:** lint/build aprovados; suítes import/finance/treasury/cash/bank/financial-intelligence/document-connectors/intelligence-experience/release-candidate com 0 FAIL; persistência de produção sem fallback silencioso para memória nos paths financeiro/intelligence/conciliação; sem nova migration nesta sprint.

---

## 7. Sprint 22.10.1 — Correções RC

| Item | Status |
|------|--------|
| Vendas/OS → `createProductionImportEngine` | Feito (staging memória **explícito**) |
| `createImportEngine` bloqueia memória silenciosa em produção | Feito (`ALLOW_IMPORT_MEMORY`) |
| Commit financeiro parcial + tentativa de rollback | Feito |
| Tipos `import_*` / `bank_*` em `types/database.ts` | Feito |
| Flags no `.env.example` | Feito |
| Placeholders de conectores “Indisponível” | Feito |
| `npm run test:rc-corrections` | Feito |
| Nova migration | **Não** (desnecessária) |
