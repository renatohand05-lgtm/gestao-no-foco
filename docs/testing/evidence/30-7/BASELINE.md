# Sprint 30.7 — Baseline Automações e Workflows Enterprise

**Data:** 2026-08-02  
**HEAD base:** `3e36267` (+ trabalho local 30.5/30.6 não commitado)  
**Branch:** `main` = `origin/main`

## Git

| Item | Valor |
|------|--------|
| Ahead/behind | 0 / 0 |
| Working tree | 30.5 CRM + 30.6 Intelligence + evidências 27-8 |
| `git diff --check` | limpo (avisos CRLF) |

## Inventário reutilizável (não duplicar)

| Capacidade | Path | Uso 30.7 |
|------------|------|----------|
| Workflow engine | `lib/workflow` | Condições/ações tipadas (referência) |
| Approval runtime | `lib/approval` | Aprovações sensíveis |
| Notifications | `lib/notifications` | Notificações internas |
| Outbox + idempotência | `lib/enterprise/outbox`, `idempotency` | Fila / dedupe |
| Automation drafts | `intelligence_automation_drafts` | Precursor (sem execução) |
| Action plans | `lib/action-plan` | Planos de ação |
| CRM tasks | `lib/crm/cliente-tarefa-service` | Ação `criar_tarefa` |
| Ops alerts | `lib/operacoes/alertas-*` | Ação `criar_alerta` |

## Gaps → 30.7

1. Sem rota/nav `/{tenant}/automacoes`
2. Sem permissões `automacoes.*`
3. Sem tabelas `automation_rules` / `automation_executions` / aprovações / audit
4. Sem engine de execução com dry-run, cooldown, loop prevention
5. Sem builder visual / templates de produto
6. Sem cron worker (fora de escopo de ativação remota nesta sprint)

## Abordagem

**Estender** com fachada `lib/automacoes` sobre enterprise stack — sem segundo motor de workflow/approval/notification.  
Migration local idempotente; **SQL remoto não executado**. Schema probe + store em memória para UI/homolog sem migration aplicada.

## Restrições

- Sem ações críticas/financeiras/externas auto-executadas
- Sem WhatsApp/e-mail/SMS/webhook/pagamento/baixa estoque
- Não alterar DRE, fluxo, CRM consolidado, estoque/compras canônicos, RBAC existente (somente **novas** perms)
- Sem commit/push/deploy
