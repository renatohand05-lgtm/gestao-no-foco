# Incident Runbook — Gestão no Foco

**Sprint 34.6.** Fluxo simples para piloto controlado. Sem sistema de tickets.

## Severidade

| SEV | Exemplos | Objetivo |
|---|---|---|
| **SEV1** | Cross-tenant; indisponibilidade total; perda de dados; cobrança real indevida (futuro) | Conter em minutos; comunicação imediata |
| **SEV2** | Módulo crítico fora; um tenant bloqueado; erros persistentes 5xx | Mitigar em horas |
| **SEV3** | UX; erro isolado; não crítico | Agendar correção |

## Fluxo

1. **Detectar** — health, relatório de usuário, logs Vercel
2. **Conter** — manutenção (`MAINTENANCE_MODE`) se necessário; pausar writes; **não** alterar Asaas
3. **Preservar evidência** — `requestId`, horário UTC, tenant/user IDs, mensagem sanitizada (sem tokens)
4. **Diagnosticar** — logs JSON (`logger`), Supabase Dashboard, membership/role/status
5. **Corrigir** — patch mínimo; migration só com checklist
6. **Validar** — smoke login + dashboard + tenant + módulo afetado
7. **Comunicar** — status ao Renato / cliente afetado
8. **Postmortem** — causa, impacto, prevenção (markdown curto em `docs/testing/evidence/`)

## Contenção rápida

| Sintoma | Ação segura |
|---|---|
| App fora | Conferir Vercel deployment Ready + `/api/health` |
| Auth fora | Supabase Auth status; Redirect URLs; Site URL |
| Suspeita cross-tenant | Isolar tenant; **não** “corrigir” tenant_id à mão; escalar SEV1 |
| Cobrança / Asaas | Billing permanece **FROZEN**; não ativar production keys |
| Migration ruim | Parar novas migrations; seguir [RECOVERY_RUNBOOK.md](./RECOVERY_RUNBOOK.md) |

## Evidência mínima a coletar

- UTC do primeiro sintoma
- `x-request-id` / `requestId` se disponível
- User ID + e-mail (não senha)
- Tenant slug + ID
- Membership status/role
- URL / módulo
- Screenshot sem dados sensíveis

## O que NÃO fazer

- Não logar/colar tokens, cookies, service role, PAN/CVV
- Não rodar restore sem decisão explícita
- Não ativar PITR / Asaas production / alterar Vercel envs sem aprovação
- Não expor stack trace ao cliente
