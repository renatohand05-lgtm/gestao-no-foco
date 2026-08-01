# Relatório — Sprint 27.6.2 (Etapa B · pós-migration)

**Data:** 2026-08-01  
**Tenant:** `teste-renato-01`  
**Migration aplicada (manual):** `supabase/migrations/20260816_intelligence_persistence_phase27_6_1.sql`  
**Classificação:** **APROVADO EM RUNTIME PÓS-MIGRATION**

---

## Veredito

Persistência real no Supabase comprovada: schema ready, CRUD de sessão/mensagem/evidência/auditoria/feedback/plano/draft, histórico reabre conversa, **reinício do servidor preserva dados**, provider externo OFF, modo deterministic, testes e build com **0 FAIL**.

---

## 1. Schema validado (runtime)

| Item | Resultado |
|---|---|
| `intelligence_sessions` | PASS (acessível + CRUD) |
| `intelligence_messages` | PASS |
| `intelligence_evidence` | PASS |
| `intelligence_audit_events` | PASS |
| `intelligence_feedback` | PASS |
| `intelligence_action_plans` | PASS |
| `intelligence_automation_drafts` | PASS |
| `probeIntelligenceSchema` ready | PASS |
| CHECK `mode` | PASS (rejeita valor inválido) |
| Índices (definição migration) | PASS (14 índices no SQL aplicado) |
| RLS enable (definição migration) | PASS (7 tabelas) |
| Policies (definição migration) | PASS (18 policies) |
| FK / constraints | PASS (inserts com refs + CHECK) |

Evidência: `docs/testing/evidence/27-6-2/schema-repos-report.json` → **65 PASS · 0 FAIL**

**Limitação:** sem `DATABASE_URL` / `psql`, `pg_catalog` (índices/policies live) não foi consultado. Validação de índices/policies = SQL da migration aplicada + comportamento runtime.

---

## 2. Repositórios

Operações homologadas via service role + app:

- criar sessão · mensagem user/assistant · evidência · audit · feedback · action plan · automation draft  
- listar sessões/mensagens/evidências · archive · soft delete  
- cross-tenant list vazio para tenant aleatório  

Nenhuma operação usa memória local como persistência em runtime (`INTELLIGENCE_TEST_MEMORY` só em testes).

---

## 3. Restart

1. Perguntas reais gravadas no Copiloto  
2. `sessionId` = `33627809-cae8-4dd6-b5ef-9b403cd155ac`  
3. Servidor Next.js reiniciado  
4. Histórico reaberto com a mesma sessão  

Resultado: **mensagens + evidências preservadas** (`restart-report.json` · `restart-sessao-preservada.png`) → **5 PASS · 0 FAIL**

---

## 4. Perguntas reais (browser)

| Pergunta | Persistência | Shot |
|---|---|---|
| Quanto tenho em caixa? | gravada | `q-caixa.png` |
| Quanto vendemos este mês? | gravada | `q-vendas.png` |
| Quantos clientes ativos tenho? | gravada | `q-clientes.png` |
| Quantas OS estão abertas? | gravada | `q-os.png` |
| Quais produtos estão abaixo do mínimo? | gravada | `q-estoque-min.png` |
| Como está meu estoque? | gravada | `q-estoque.png` |
| Qual é meu principal risco? | gravada | `q-risco.png` |
| O que devo priorizar hoje? | gravada | `q-prioridade.png` |

UI exibe: modo deterministic, confiança, evidências, limitações, persistência gravada, provider OFF.

---

## 5. Validação cruzada

- Copiloto (caixa): cita saldo consolidado **122142** (snippet em `cross-module-report.json`)  
- Financeiro/caixa: **R$ 122.142,00**  
- Match canônico (mesmo saldo; sem inventar número paralelo)  
- Resposta mantém limitações honestas (ex.: churn/supply quando aplicável)

Evidência: `cross-module-report.json` · `cross-caixa-*.png`  
Módulos acessíveis na captura: financeiro, vendas, CRM, OS, estoque.

---

## 6. Histórico

- Lista de sessões com data, modo, status, provider  
- Reabrir conversa (`?session=`) com mensagens + evidências  
- Arquivar / soft delete (controles + repos)  
- Isolamento por tenant/usuário nas actions  

Captura inicial (`capture-report.json`): **31 PASS · 1 FAIL** — o FAIL foi o check rápido de reopen (wait curto). Revalidação imediata com wait adequado: `detail=1`, `msgs=2`, `evid=1` (`reopen-debug.json` · `sessao-reaberta.png`). Restart confirmou preservação (`restart-report.json`).

**Limitação UI:** busca/filtro avançados ainda mínimos (lista + reopen + archive/delete).

---

## 7. Auditoria

Eventos persistidos com correlationId, mode deterministic, provider deterministic, intent, status (`auditoria.png`). Provider externo permanece OFF.

---

## 8. Tenant isolation

- Repos filtram `tenant_id`  
- Lista cross-tenant vazia (homolog)  
- Suite `test:intelligence-cross-tenant-deny` PASS  
- Policies migration baseadas em `tenant_members`

---

## 9. RBAC

- `npm run test:rbac` → **92 PASS · 0 FAIL**  
- `test:intelligence-rbac` (estrutura permissions) PASS  
- Browser homologado com usuário **Owner** (`teste-renato-01`)  

**Limitação:** matriz completa de papéis (Financeiro/Comercial/Leitura/…) não foi refeita papel a papel no browser nesta Etapa B; gates estruturais + Owner runtime OK.

---

## 10. Provider

- Modo deterministic ativo  
- external: OFF / não configurado (UI config)  
- Sem tokens/custos fictícios de provedor externo  
- Mensagem clara: “não é IA generativa”

---

## 11. Testes

| Suite | Resultado |
|---|---|
| `test:intelligence-persistence-contracts` … `cross-tenant-deny` (19 scripts) | **0 FAIL** |
| `npm run lint` | **0 errors** (21 warnings pré-existentes em scripts) |
| `npm run build` | OK |
| `npm run test:rbac` | **92 PASS · 0 FAIL** |
| `npm run test:release-candidate` | **64 PASS · 0 FAIL** |
| Homolog schema/repos | **65 PASS · 0 FAIL** |
| Restart verify | **5 PASS · 0 FAIL** |

**Total FAIL = 0**

---

## 12. Screenshots

Diretório: `docs/testing/evidence/27-6-2/`

Inclui: copiloto deterministic, perguntas, evidência, confiança, feedback, histórico, sessão reaberta, restart, auditoria, provider OFF, config ready, viewports (desktop/notebook/tablet/mobile), theme dark/light, cross-caixa, plano-acao.

---

## 13. Confirmações

- Nenhum dado fictício inventado como “IA externa”  
- Nenhuma IA externa simulada como ativa  
- Nenhuma regra financeira canônica alterada  
- Identidade visual preservada  
- Nenhum SQL adicional executado automaticamente pelo agent  
- Nenhum commit / push / deploy  

---

## 14. Limitações / pendências menores

1. Catálogo Postgres live (índices/policies) não consultável sem `DATABASE_URL`  
2. RBAC browser completo por papel — pendência operacional (Owner validado)  
3. Histórico: busca/filtro/empresa/filial na UI ainda simples  
4. Plano de ação só grava quando `response.actions.length > 0`  

Nenhuma pendência bloqueia o encerramento da Fase 27 sob o critério de persistência real pós-migration.

---

## Encerramento da Fase 27

Com a Etapa B aprovada em runtime, a **Fase 27** encerra com persistência enterprise real, Copiloto deterministic live e provider externo OFF.
