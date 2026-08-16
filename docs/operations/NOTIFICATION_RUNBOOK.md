# Runbook — comunicação de agenda/retornos (Sprint 35.2)

## Modos (`RETENTION_NOTIFY_MODE`)

| Modo | Efeito | Status no outbox |
|---|---|---|
| `disabled` | Nada sai | `cancelled` |
| `dry_run` | **Default.** Persiste preview, não envia | `dry_run` |
| `manual_link` | Gera `wa.me` para o operador | `manual_opened` (**não** `delivered`) |
| `provider` | Preparado, **não ativo** | `ready` — cron força `dry_run` |

Não fingir entrega. Retry usa a mesma `idempotency_key`.

## Canais

- WhatsApp: somente link manual até provider oficial aprovado (Meta Cloud API / Twilio / Z-API / 360dialog — **não** contratar neste sprint).
- E-mail: DRY_RUN. Sem provider transacional de cliente neste fluxo.

## Opt-out

`communication_preferences`: `whatsapp_enabled`, `email_enabled`, `opted_out_at`. Canal off → `cancelled`.

## Cron

- Rota: `GET/POST /api/cron/retention`
- Auth: `Authorization: Bearer $CRON_SECRET`
- Sem secret → **401**
- **PRODUCTION: DISABLED** — não cadastrar na Vercel
- Janela 08:00–19:00 `America/Sao_Paulo`
- Worker usa `createAdminClient` se service role existir; senão skip

## Envs

| Env | Necessidade | Notas |
|---|---|---|
| `CRON_SECRET` | já existe no ecossistema; **não criada automaticamente** | ausente = cron 401 |
| `RETENTION_NOTIFY_MODE` | opcional | default código = `dry_run` |
| `SUPABASE_SERVICE_ROLE_KEY` | já existe | só para o job admin |

Nenhuma env nova obrigatória.

## Régua (offsets configuráveis por segmento)

Exemplo oficina: D-10, D-3, D0, D+7. Consultoria usa `REENGAJAMENTO` no D+7.

## Rollback

1. Não aplicar cron.
2. `RETENTION_NOTIFY_MODE=disabled`.
3. Outbox permanece auditável.

## Homologação

Não enviar mensagem real para cliente real. Testar DRY_RUN + `wa.me` manual em tenant de homologação após aplicar a migration 35.2.
