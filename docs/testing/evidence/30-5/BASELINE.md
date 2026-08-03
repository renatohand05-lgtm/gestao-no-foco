# Sprint 30.5 — Baseline CRM Premium

**Data:** 2026-08-02  
**HEAD:** `3e36267` (Release 30.3–30.4.1)  
**Escopo:** elevar CRM Enterprise existente — sem recriar módulo, sem migration/SQL remoto.

---

## Estado git (auditoria)

- Branch `main` sincronizada com release anterior.
- Working tree: apenas ruído fora de escopo (`docs/testing/evidence/27-8-*`, `29-*/phase29-summary.json`).
- `git diff --check`: sem problemas em código CRM (apenas CRLF warnings em summaries).

---

## Inventário atual

| Superfície | Path | Estado |
|------------|------|--------|
| Hub CRM | `/crm` → `/crm/executivo` | Enterprise dashboard |
| Funil Kanban | `/clientes/funil` + `CrmFunilBoard` | DnD + soma por coluna; cards básicos |
| Oportunidades | `/crm/oportunidades` | Lista + KPIs; sem board |
| Follow-ups | `/crm/follow-ups` | Buckets vencidos/hoje/7d/sem data |
| Timeline | `CrmTimeline` no Cliente 360 | Lista tipada básica |
| Score | `clientes.score` + badges | Campo armazenado; sem motor determinístico configurável |
| Previsão | `previsao_fechamento` | Soma proposta+negociação (não ponderada por probabilidade) |
| Motivos perda | eventos `%perda%` | Texto livre; sem categorias padronizadas |

---

## Gaps → Sprint 30.5

1. Dashboard executivo com KPIs de pipeline/opps + MoM reais.
2. Cards Kanban com valor, probabilidade, contato, ação, responsável, idade, parado, prioridade, score.
3. Filtros/busca/colapso no funil.
4. Timeline Premium (tipos comerciais + anexos).
5. Follow-up: amanhã / esta semana / sem responsável + ações.
6. Score determinístico configurável.
7. Previsão ponderada `valor × probabilidade`.
8. Análise de motivos de perda categorizada.
9. Clientes em risco + ranking por responsável.
10. Perf CRM cold ≤2,5s / warm ≤1,3s.

---

## Alvos de performance

| Métrica | Alvo |
|---------|------|
| Cold (CRM executivo / funil) | ≤ 2500 ms |
| Warm | ≤ 1300 ms |

---

## Restrições

- Não alterar RBAC, DRE, regras financeiras, estoque, compras.
- Não inventar números.
- Não executar commit/push/deploy/SQL remoto.
