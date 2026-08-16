# Notificações de cliente (Sprint 35.2.2)

Infraestrutura em cima da **outbox 35.2**. Não há fila paralela. Billing não é alterado.

## Estado desta entrega

| Canal | Produção |
|---|---|
| WhatsApp real | **MANUAL PENDING** (kill switch OFF) |
| E-mail real | **MANUAL PENDING** (kill switch OFF) |
| Cron | **DISABLED** |
| Default | DRY_RUN / wa.me |

Nenhum provider real envia sem `WHATSAPP_ENABLED=true` / `EMAIL_ENABLED=true` **e** homologação explícita.

## Providers

Contrato: `NotificationProvider` (`send`, `getStatus`, `handleWebhook`, `validateConfiguration`).

WhatsApp: `DISABLED` | `DRY_RUN` | `MANUAL_LINK` | `META_CLOUD`  
E-mail: `DISABLED` | `DRY_RUN` | `PROVIDER` (Resend)

A regra de negócio (Agenda, OS, Retornos) não chama a Graph API.

## Eventos

`AGENDAMENTO_CRIADO`, `AGENDAMENTO_CONFIRMADO`, `LEMBRETE`, `REAGENDAMENTO`, `CANCELAMENTO`, `RETORNO_D10/D3/HOJE/ATRASADO`, `REENGAJAMENTO`, `SERVICE_READY`, `SERVICE_DELIVERED`.

Automação por tenant começa **OFF**. Clique do operador em “Finalizar e avisar” é explícito e respeita opt-out.

## SERVICE_READY

Capability `work_orders` (oficina e lava-rápido). Não aparece em consultoria, odontologia, barbearia nem estética, salvo override futuro da capability.

Status existentes:

`em_execucao` → `pronto_para_entrega` (aguardando retirada) → `entregue`

“Finalizar sem notificar” permanece sempre disponível.

## Opt-out, fallback, rate limit

- `communication_preferences.opted_out_at` cancela automação operacional.
- Fallback e-mail só com `fallbackEmail` e WhatsApp indisponível. Nunca dual-send default.
- ~80 envios reais / tenant / hora; anomalia pausa a fila.

## Variáveis de template

`cliente_nome`, `empresa_nome`, `data`, `hora`, `servico`, `profissional`, `veiculo`, `placa`, `dias_para_retorno`. Sem eval/JS/SQL. E-mail HTML é escapado.
