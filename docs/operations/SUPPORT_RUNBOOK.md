# Support Runbook — Primeiro cliente (piloto)

**Sprint 34.6.** Suporte seguro: perguntar → verificar → agir sem escalar privilégio.

## Antes de qualquer correção, confirmar

1. User ID + e-mail
2. Tenant slug + tenant ID
3. Membership existe? status (`active`/`inactive`)?
4. Role
5. Record ID afetado (se houver)
6. Horário UTC do problema
7. `requestId` se o usuário tiver (raro)

**Nunca** alterar `tenant_id` “para funcionar” sem essas confirmações.

## Cenários

### Não consegue login

- Perguntar: e-mail exato; mensagem na tela; browser.
- Verificar: Auth users no Supabase; e-mail confirmado; Redirect URLs.
- Não fazer: resetar senha pelo painel sem o fluxo `/recuperar`.
- Ação: orientar `/recuperar`; se conta inexistente, cadastro/convite.
- Escalar: Auth fora / 5xx persistente.

### Senha / recuperação

- Verificar: e-mail chegou? link abre `gestao-no-foco.vercel.app` (não localhost)?
- Ação: reenviar via `/recuperar`; aguardar rate limit do Supabase.
- Não fazer: pedir senha atual; colar tokens do e-mail em chat.

### Convite

- Verificar: convite `pending`? expirado/cancelado? e-mail bate com a conta logada?
- Ação: reenviar (novo link) ou copiar link (fallback); usuário deve logar com o e-mail convidado.
- Não fazer: aceitar convite com outra conta.

### Usuário não vê empresa

- Verificar: membership ativa; filtro inactive (34.2).
- Ação: reativar via Equipe se autorizado; ou novo convite se inactive.
- Não fazer: insert manual em `tenant_members` sem auditoria.

### Vê empresa errada / dados misturados

- Tratar como **SEV1 potencial**.
- Conter; coletar IDs; não “corrigir” IDs à mão.
- Escalar imediatamente.

### Dashboard vazio

- Normal em empresa nova (empty states).
- Orientar primeiro cadastro: cliente → produto → venda.
- Verificar onboarding resume / checklist.

### Venda / estoque / OS não aparece

- Verificar: filtros; tenant correto no switcher; permissões RBAC.
- Não fazer: copiar registro entre tenants.

### Documento / upload falha

- Verificar: tamanho ≤ 10MB; bucket privado; membership ativa; path do tenant.
- Ação: reenviar; se 403, revisar permissão `clientes.*` / CRM.

### Erro financeiro

- Verificar mensagem amigável; logs server-side.
- Billing: lembrar **sandbox / frozen** — não cobrar de verdade.

### Troca de empresa

- Usar switcher; limpar expectativa de dados misturados (não devem misturar).

### Billing sandbox visível

- Esperado enquanto frozen.
- Não ativar Asaas production nem `BILLING_REAL_CHARGES_ENABLED`.

## Quando escalar

- Suspeita de cross-tenant / perda de dados / indisponibilidade total → SEV1 ([INCIDENT_RUNBOOK.md](./INCIDENT_RUNBOOK.md))
- Migration / restore → [RECOVERY_RUNBOOK.md](./RECOVERY_RUNBOOK.md)
