# Backlog Técnico — Gestão no Foco

Documento de melhorias futuras. **Não representa pendências bloqueantes** da Sprint 9 (encerrada no RC 9.9.2).

Última atualização: Sprint 9.9.2 — Release Candidate.

---

## Sprint 10 — candidatos

| Item | Descrição | Prioridade |
|------|-----------|------------|
| Canal / origem em vendas | Campo + metas/share por canal (migration com aprovação) | Alta |
| Vendedor comercial | Vínculo real venda ↔ vendedor (não usar `created_by`) | Alta |
| Meta de ticket | Estrutura dedicada | Média |
| Feriados em dias úteis | Calendário no motor de projeção | Média |
| Completar stubs | Ordens CRUD, Relatórios, Fornecedores | Alta |
| Formulário “Nova movimentação” / UI estorno | Fluxo de Caixa operacional | Alta |
| Agregações SQL rankings | GROUP BY / RPC | Média |
| Nomenclatura `novo` vs `nova` | Unificar rotas onde seguro | Baixa |
| Tokens DS em tons status | Substituir `emerald-*`/`rose-*` soltos por `dsStatus` | Baixa |
| `any` residual em forms CR/CP | Tipar resolvers sem cast | Baixa |

---

## Sprint 9 — concluído (referência)

Ver [docs/releases/SPRINT_9.md](../releases/SPRINT_9.md).

---

## Decisões de Arquitetura (intencionais)

- Faturamento atômico (RPC); cancelamento com título recebido bloqueado
- Movimentações bancárias: reversão somente via estorno
- `forma_pagamento` legado mantido até migração
- `vencido` calculado na leitura
- Migrations manuais no SQL Editor

---

## Referências

- [ROADMAP.md](./ROADMAP.md)
- [ARCHITECTURE.md](../architecture/ARCHITECTURE.md)
- [CHANGELOG.md](../../CHANGELOG.md)
