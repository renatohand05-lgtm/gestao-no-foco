# Sprint 31.4 — REPORT CRM Mobile

## Classificação

**APROVADA COM RESSALVAS**

Ressalvas:

1. Device QA Android/iOS **não executado** (não homologar store).
2. Drag-and-drop nativo do pipeline: cartões por estágio no app; reordenação continua no CRM Web.
3. Mutações de follow-up (concluir/adiar/atribuir) apontam para CRM Web nesta sprint.

## Resumo técnico

CRM Mobile espelha o padrão 31.3: Bearer + membership + RBAC → `crm-compose` reusando services premium/enterprise Web (forecast, score, funil, follow-ups, ranking, risk). Tab **CRM** no Expo com home offline RO e subtelas online.

## Arquitetura / APIs

Ver `docs/architecture/PHASE_31_4_CRM_MOBILE.md` e `MOBILE_CRM_API.md`.

10 endpoints: dashboard, pipeline, clients, clients/:id, timeline, followups, opportunities, forecast, ranking, alerts.

## Gates (sessão)

| Gate | Resultado |
|------|-----------|
| homolog-31-4 | 9 PASS · 0 FAIL |
| tsc | 0 |
| lint (root) | 0 |
| build | 0 (rotas CRM listadas) |
| test:rbac | 92 PASS |
| test:release-candidate | 65 PASS |
| mobile:typecheck | 0 |
| mobile:lint | 0 |
| mobile:test | 2 PASS |
| Expo Doctor | **20/20** |

## Offline / RBAC / Performance

- Snapshot `@gof/cache/crm-summary/{tenantId}` (home).
- Listas/detalhe online-only.
- RBAC via `crm.*` / `clientes.*`.
- Performance em device: não medida (ver PERFORMANCE.md).

## Pendências

- QA device 375/390/430/tablet dark/light.
- DnD nativo pipeline (opcional sprint futura).
- Mutações follow-up nativas (opcional).
- Commit quando o usuário autorizar.

## Sem commit / push / deploy / EAS
