# Roadmap — Gestão no Foco

Roadmap oficial de entregas do produto.  
Última atualização: **Sprint 9.9.2 — Release Candidate** (fechamento da Sprint 9).

---

## Marco atual

### Sprint 9 — ENCERRADA (RC 9.9.2)

Arquitetura congelada (9.7), performance (9.8.x), metas/projeção (9.8.5–9.8.6), painel comercial (9.8.7–9.9), exclusão segura de metas (9.9.1), limpeza e release notes (9.9.2).

Release notes: [docs/releases/SPRINT_9.md](../releases/SPRINT_9.md).

### Base Financeira + Dashboard + Comercial

| Área | Status |
|------|--------|
| Estrutura financeira / CR / CP / RPCs | Estável |
| Fluxo de Caixa (real + paginação lista) | Estável |
| DRE Real | Estável |
| Dashboard executivo (streaming) | Estável |
| Metas + projeção + soft delete | Estável |
| Painel Comercial enterprise | Estável |

---

## Sprint 9 — visão

| Sub | Foco | Status |
|-----|------|--------|
| 9.7 | Architecture Freeze | Concluído |
| 9.8–9.8.4 | Performance + rankings + streaming + paginação Fluxo | Concluído |
| 9.8.5–9.8.6 | Metas + projeção avançada | Concluído |
| 9.8.7–9.9 | Painel Comercial | Concluído |
| 9.9.1 | Soft delete metas + pendências | Concluído |
| **9.9.2** | **Release Candidate** | **Concluído** |

---

## Próximo — Sprint 10 (planejado)

| Item | Descrição |
|------|-----------|
| Canal / origem de venda | Modelagem + UI (com migration aprovada) |
| Vendedor comercial | Vínculo venda ↔ vendedor |
| Meta de ticket | Estrutura dedicada |
| Feriados em dias úteis | Calendário no motor de projeção |
| Ordens / Relatórios / Fornecedores | Completar stubs |
| Nova movimentação / UI estorno | Fluxo de Caixa operacional |
| Agregações SQL rankings | RPC / GROUP BY |

### Regras (herdadas)

- Não alterar autenticação nem onboarding sem necessidade
- Migrations SQL separadas, sem execução automática
- Multi-tenant obrigatório
- Design System existente
- Não quebrar módulos já entregues (DRE, Fluxo, CR/CP)

---

## Documentos relacionados

- [Backlog técnico](./backlog-tecnico.md)
- [Release Sprint 9](../releases/SPRINT_9.md)
- [Arquitetura](../architecture/ARCHITECTURE.md)
- [Performance](../architecture/PERFORMANCE.md)
- [Changelog](../../CHANGELOG.md)
