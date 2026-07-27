# ADR — Enterprise Fase 21 Release Candidate

**Status:** Aceito  
**Data:** 2026-07-27  
**Contexto:** Fechamento oficial da Fase 21 como Release Candidate.

## Decisão

1. A Fase 21 é declarada **RC** sob versão **`21.10.0-rc.1`**.
2. Timeline e Observability permanecem **consumidores read-only** de engines/persistência existentes.
3. Approval Runtime é o caminho canônico de **mutação** de aprovações em produção (domínio + Enterprise kit).
4. Quality gate oficial da Fase 21: `npm run test:enterprise-rc` + `lint` + `build`.
5. Correções estruturais (unificar stacks RBAC/audit/workflow paralelos, remover fallback de permissão, cron SLA) ficam para **Fase 22** — fora do escopo do RC.

## Consequências

- Produção pode consumir a stack Enterprise com checklist de release.
- Dívidas conhecidas estão documentadas e não bloqueiam o RC se quality gates passarem.
- Nenhuma migration adicional é exigida para declarar o RC.
