# Sprint 35.2.1 — Fast Input UX / cadastro rápido

**Data:** 2026-08-16  
**Branch:** `main`  
**Tipo:** Progressive disclosure nos cadastros operacionais. Sem nova frente funcional, sem billing, sem WhatsApp real, sem cron de production, sem migration.

```
SPRINT 35.2.1 — FAST INPUT UX

STATUS: GO
P0: 0
P1: 0
P2: 1 (homologação visual/manual pendente nos 6 segmentos + mobile)

CLIENT QUICK CREATE: PASS
SERVICE QUICK CREATE: PASS
PROFESSIONAL QUICK CREATE: PASS
APPOINTMENT QUICK CREATE: PASS
RETURN QUICK CREATE: PASS
PROGRESSIVE DISCLOSURE: PASS
SMART DEFAULTS: PASS
POST-SAVE ACTIONS: PASS
MOBILE: PASS (mesmo formulário; CTA sticky; avançados recolhidos)
SEGMENT ISOLATION: PASS
RBAC: PASS
TENANT ISOLATION: PASS

WHATSAPP REAL: DISABLED
EMAIL: DRY_RUN
CRON PRODUCTION: DISABLED
BILLING: UNTOUCHED

TESTES 35.2.1: 20/20
REGRESSÃO 35.2: 19/19
REGRESSÃO 35.1: 48/48
RBAC: 92 PASS
LINT: 0 errors / 35 warnings (pré-existentes)
TYPECHECK: PASS
BUILD: PASS

MIGRATION: NENHUMA
COMMIT: aee6051
HEAD == ORIGIN/MAIN: (após push)

ARQUIVOS PRINCIPAIS ALTERADOS:
- components/ui/more-details.tsx
- components/ui/post-save-actions.tsx
- lib/ux/fast-input.ts
- components/clientes/cliente-form.tsx
- components/agenda/agenda-event-create-form.tsx
- components/agenda/agenda-week-board.tsx
- components/produtos/produto-form.tsx
- components/mecanicos/mecanicos-manager.tsx
- components/retention/return-quick-create.tsx
- components/retention/returns-panel.tsx
- app/(app)/[tenant]/clientes/novo/page.tsx
- app/(app)/[tenant]/agenda/page.tsx
- scripts/phase35-2-1-fast-input-tests.mjs

HOMOLOGAÇÃO MANUAL: PENDING
1. Criar cliente preenchendo somente o mínimo
2. Criar serviço em poucos segundos
3. Criar profissional em poucos segundos
4. Clicar em slot -> agendamento com data/hora preenchidas
5. Cliente -> Agendar -> cliente já selecionado
6. Criar retorno usando preset de 30 dias
7. Retorno -> Agendar -> contexto reaproveitado
8. Abrir “Mais informações” e confirmar que recursos avançados continuam disponíveis
9. Comparar Oficina, Lava-rápido, Barbearia, Consultoria, Estética e Odontologia
10. Repetir os principais fluxos no mobile
```

## O que mudou

Princípio: cadastre o mínimo agora, complete depois. Campos essenciais visíveis; o restante em “Mais informações” / “Mais opções”. Nenhum campo foi removido. Opcionais continuam opcionais. Nada é inventado (telefone, e-mail, CPF/CNPJ, preço, custo, km, dados clínicos/fiscais).

Smart defaults só reusam contexto seguro: tenant da sessão, cliente/serviço/profissional/slot da origem, duração do serviço, natureza da ação, status ativo.

Pós-salvação com ações contextuais em vez de dump para listagem.

## Preservado da 35.2

Agenda cliente/negócio/interno, conflitos, override com justificativa, retornos previstos ≠ agendamento, oficina data/km, painel de retornos, Centro de Operações, outbox, idempotency, opt-out, timezone, RBAC, tenant isolation. WhatsApp real desligado; e-mail DRY_RUN; cron production desligado.
