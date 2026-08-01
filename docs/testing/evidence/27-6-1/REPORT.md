# Relatório — Sprint 27.6.1

**Data:** 2026-08-01  
**Tenant:** `teste-renato-01`  
**Classificação:** **PRONTO PARA APLICAÇÃO DA MIGRATION**

Etapa B (pós-migration) **não** foi executada — nenhum SQL foi aplicado pelo agent.

---

## Veredito

Os dois pontos estruturais da ressalva da Fase 27 foram tratados no código:

1. **Persistência real** — migration + repositórios + UI pending/ready; **sem fallback in-memory em runtime**.
2. **Wiring canônico do Copiloto** — `askIntelligenceAction` carrega `loadLiveIntelligenceContext` (caixa, vendas, CRM, OS, supply); não usa mais `metrics: []`.
3. **Provider assisted** — permanece OFF; UI mostra unavailable / “não configurado”.

Sem migration aplicada, a classificação máxima permitida é **PRONTO PARA APLICAÇÃO DA MIGRATION**.

---

## MIGRATION PENDENTE DE APLICAÇÃO MANUAL

Arquivo:

`supabase/migrations/20260816_intelligence_persistence_phase27_6_1.sql`

Instruções: `docs/architecture/INTELLIGENCE_PERSISTENCE_27_6_1.md`  
Auditoria inicial: `docs/architecture/INTELLIGENCE_27_6_1_AUDIT.md`

**Não foi executada. Não declarar persistência homologada até Etapa B.**

---

## Matriz (resumo)

| Componente | Antes | Depois |
|---|---|---|
| Audit STORE[] | memória como “persistência” | memória só `INTELLIGENCE_TEST_MEMORY=1`; runtime via repo ou unavailable |
| Feedback[] | memória | idem + insert repo |
| Evidence Map | working set | working set request + persist em message |
| askIntelligenceAction | `metrics: []` | live adapters canônicos |
| Histórico/Auditoria UI | placeholder / memory list | pending explícito ou list repo |
| Provider | stub OFF | OFF explícito na UI |

---

## Entregas principais

### Persistência
- 7 tabelas + índices + RLS + policies
- `persistence/schema.ts` (probe estrito: só ready se todas as tabelas OK)
- `persistence/repositories.ts`
- Actions: session/message/evidence/audit/feedback

### Live context
- `adapters/live-context.ts` → cash, vendas, CRM, OS, supply
- Number verification em `verification/numbers.ts` (bloqueia divergência)
- Confidence com missingSources reais

### UI
- Histórico / Auditoria / Configurações com estado pending
- Evidence drawer com deep link, freshness, reliability
- Modo Determinístico oficial + provider OFF

---

## Evidências browser (Etapa A)

`docs/testing/evidence/27-6-1/` · `capture-report.json` → **8 PASS · 0 FAIL · 9 shots**

- `config-provider-off-schema-pending.png`
- `historico-pending.png` / `auditoria-pending.png`
- `copiloto-deterministic-vazio.png`
- `copiloto-caixa-live.png` / `evidencias-live.png`
- `copiloto-vendas.png` / `copiloto-estoque.png` / `copiloto-os.png`

---

## Testes

| Suite | Resultado |
|---|---|
| `npm run test:phase27-6-1` | **55 PASS · 0 FAIL** |
| `npm run test:phase27-block1` | 0 FAIL |
| `npm run test:phase27-block2` | 0 FAIL |
| `npm run test:release-candidate` | 0 FAIL |
| lint (intelligence) | 0 errors |
| build | OK |

Scripts novos: `test:intelligence-persistence-contracts` … `test:intelligence-cross-tenant-deny` + `test:phase27-6-1`.

---

## Confirmações

- Nenhuma regra financeira canônica alterada
- Nenhum provider simulado como ativo
- Identidade visual preservada
- Nenhum SQL executado / migration não aplicada
- Nenhum commit / push / deploy

---

## Próximo passo (humano)

1. Aplicar `20260816_intelligence_persistence_phase27_6_1.sql` no Supabase  
2. Smoke SQL do doc de persistência  
3. Reiniciar / reabrir Copiloto  
4. Homologar Etapa B (sessão, histórico, restart, isolation)  
5. Só então considerar **APROVADO EM RUNTIME PÓS-MIGRATION**
