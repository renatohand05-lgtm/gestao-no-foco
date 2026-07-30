# Homologation Checklist — Sprint 22.10

**Produto:** Import Intelligence + Conciliação Bancária  
**Versão alvo:** 22.10 RC  
**Ambiente:** Staging / homologação (nunca produção sem gate)

Marque cada item após execução manual. Registe evidência (screenshot, run ID, timestamp).

---

## Pré-requisitos

- [ ] Migrations `20260809` e `20260810` aplicadas no Supabase de homologação
- [ ] Feature flags **desligadas** por default (confirmar via `getEnterpriseFeatureFlags()` ou env)
- [ ] `npm run test:release-candidate` → 0 FAIL
- [ ] `npm run test:rc-corrections` → 0 FAIL (homologação técnica automatizada 22.10.1)
- [ ] Tenant de teste dedicado (não usar dados de produção reais)

---

## 1. Perfis RBAC

### 1.1 Owner / Admin

- [ ] Acesso a `/[tenant]/integracoes` e sub-rotas
- [ ] Importar financeiro (Excel/CSV/OFX)
- [ ] Criar/editar perfis de mapeamento
- [ ] Executar rollback de import financeiro concluído
- [ ] Abrir conciliação bancária (Cash Intelligence)

### 1.2 Financeiro (manager com `financeiro.criar`)

- [ ] Importar movimentações
- [ ] Revisão assistida — confirmar/rejeitar sugestões
- [ ] Ver histórico e auditoria de runs
- [ ] Conciliar linhas de extrato

### 1.3 Read-only

- [ ] Pode visualizar histórico e KPIs (se RBAC permitir leitura)
- [ ] **Não** pode importar, confirmar, rollback ou alterar perfis
- [ ] Tentativa de ação mutável retorna erro de permissão claro (sem stack trace)

---

## 2. Tenant vazio

- [ ] Centro de Inteligência exibe estado vazio (sem runs fictícios)
- [ ] KPIs zerados / mensagem "Sem runs recentes"
- [ ] Importação inicial cria primeiro run visível no histórico
- [ ] Isolamento: tenant B não vê runs do tenant A

---

## 3. Volume grande

- [ ] Import CSV/Excel com ≥5.000 linhas — preview responsivo
- [ ] Commit parcial ou rejeição parcial registrada corretamente
- [ ] Duração e contadores (`total_rows`, `imported_rows`) coerentes
- [ ] Sem timeout silencioso — erro explícito se limite excedido

---

## 4. Formatos de documento

| Formato | Caso de teste | OK |
|---------|---------------|-----|
| DRE (Excel/CSV) | Interpretação + classificação | [ ] |
| Folha de pagamento | `interpretPayroll` + revisão | [ ] |
| Extrato bancário OFX | Linhas → conciliação | [ ] |
| PDF texto pesquisável | Parse + linhas | [ ] |
| PDF image-only | Rejeitado (sem OCR flag) | [ ] |
| Excel (.xlsx) | Mapeamento automático | [ ] |
| CSV | Sanitização injection | [ ] |
| XML financeiro | Parse seguro | [ ] |
| CNAB (.ret/.rem) | Mensagem "em preparação" — não importa | [ ] |

---

## 5. Duplicidade

- [ ] Reimportar mesmo `external_id` OFX não duplica linha bancária
- [ ] UI/verdict indica duplicidade — não exclui silenciosamente
- [ ] Duplicidade cross-tenant não detectada erroneamente

---

## 6. Revisão assistida

- [ ] Item baixa confiança aparece em `/integracoes/revisar`
- [ ] Confirmação humana persiste decisão
- [ ] Regra aprendida reflete confirmação (após segundo import similar)

---

## 7. Conciliação

- [ ] Linhas importadas visíveis na sessão de conciliação
- [ ] Match manual/auto registrado
- [ ] UI **sem** strings demo fictícias (ex.: "PAGTO FORNECEDOR XYZ")
- [ ] Erro de persistência visível ao operador (não fallback silencioso)

---

## 8. Rollback

- [ ] `prepareImportRollback` lista itens revertíveis
- [ ] `executeImportRollback` estorna movimentações financeiras
- [ ] Run marcado `rolled_back` no histórico
- [ ] Segundo rollback do mesmo run rejeitado

---

## 9. Conectores

- [ ] Hub conectores mostra todos como "Em preparação"
- [ ] Nenhum conector exibido como "Conectado" sem config real
- [ ] Webhook com flag off → HTTP 503 preparing
- [ ] API com flag off → HTTP 503 preparing

---

## 10. Provider / credenciais

- [ ] Sem `IMPORT_EXTERNAL_AI_ENABLED` → classificação determinística
- [ ] Provider externo com credenciais fake **não** inventa categorias "mágicas"
- [ ] Mensagem clara quando provider indisponível

---

## 11. Erros e credenciais ausentes

- [ ] Webhook sem secret configurado → 401/503, não processa
- [ ] API sem `IMPORT_API_KEY` → unauthorized
- [ ] Respostas de erro **sem** stack trace no JSON/UI
- [ ] `toSafeClientMessage` em paths API webhook (spot-check logs)

---

## 12. Segurança

- [ ] Upload `.exe` bloqueado
- [ ] CSV com fórmula `=cmd` neutralizada
- [ ] Payload webhook com `tenantId` diferente do conector → forbidden
- [ ] Replay com mesma idempotency key → conflict
- [ ] Conteúdo com "ignore previous instructions" flagged (prompt injection)

---

## 13. Observabilidade

- [ ] Eventos `import.*` emitidos em upload/erro (logs staging)
- [ ] Logs **não** contêm conteúdo de arquivo, tokens ou números de conta completos

---

## 14. Gates automatizados (registrar resultado)

| Comando | PASS | FAIL | Data |
|---------|------|------|------|
| `npm run test:release-candidate` | 64 | 0 | 2026-07-29 |
| `npm run test:import-engine` | 179 | 0 | 2026-07-29 |
| `npm run test:bank-reconciliation` | 28 | 0 | 2026-07-29 |
| `npm run test:document-connectors` | 57 | 0 | 2026-07-29 |
| `npm run test:rc-corrections` | 68 | 0 | 2026-07-29 |
| `npm run test:homologation-rc` | 72 | 0 | 2026-07-29 |
| `npm run lint` + `npm run build` | OK | 0 | 2026-07-29 |

Evidência consolidada: [`HOMOLOGATION_EVIDENCE_22_10_2.md`](./HOMOLOGATION_EVIDENCE_22_10_2.md)

---

## Sign-off

| Papel | Nome | Data | GO / NO-GO |
|-------|------|------|------------|
| Engenharia | Auto (estrutural + gates) | 2026-07-29 | **GO com ressalvas** (smoke staging pendente) |
| QA | | | |
| Produto | | | |
| Segurança | | | |

**Condições residuais / bloqueadores:**

1. Smoke browser com perfis reais em staging (Owner/Admin/Financeiro/Read-only/cross-tenant).  
2. Confirmar migrations `20260809` e `20260810` no Supabase de homologação.  
3. Volume ≥5.000 linhas e fluxo OFX→conciliação end-to-end na UI.  
4. Fila global `/integracoes/revisar` ainda empty-state (revisão no wizard).  
