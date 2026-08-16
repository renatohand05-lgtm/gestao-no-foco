# Notificações de cliente (Sprint 35.2.3)

Infraestrutura em cima da **outbox 35.2 / 35.2.2**. Não há fila paralela. Billing não é alterado.

## Estado desta entrega

| Canal | Produção |
|---|---|
| WhatsApp real | **MANUAL PENDING** (kill switch OFF) |
| E-mail real | **MANUAL PENDING** (kill switch OFF) |
| Cron | **DISABLED** |
| `COMMUNICATION_MODE` | **test** (nunca `live` nesta sprint) |
| Default | DRY_RUN / wa.me |

Nenhum provider real envia sem `WHATSAPP_ENABLED=true` / `EMAIL_ENABLED=true`, destinatário na allowlist em `test`, **e** homologação explícita.

`COMMUNICATION_MODE=disabled|test|live`
`COMMUNICATION_TEST_ALLOWLIST` — telefones/e-mails autorizados (nomes só; valores fora do git).

## Central e timeline

CRM → Comunicações: KPIs e filtros por tenant. Cadastro do cliente: aba Comunicações (status operacional Aguardando / Enviado / Entregue / Falhou). “Ver detalhes” só com `crm.notificacoes.enviar`.

## Pipeline

draft / scheduled / queued / processing / sent / delivered / read / failed / cancelled / suppressed

`delivered` e `read` só com webhook do provider. `sent` = provider aceitou. Opt-out / sem canal persistidos como `suppressed`. Retry automático só transiente, na mesma linha.

## SERVICE_READY / agenda / retornos

Preservados 35.2.2. Confirmação de agendamento: “Confirmação preparada” ou “Cliente sem canal disponível”. Retornos reutilizam a outbox; metadata `cta.schedule_return` para evolução futura (sem chatbot).

## Variáveis de template

`cliente_nome`, `empresa_nome`, `data`, `hora`, `data_hora`, `servico`, `profissional`, `veiculo`, `placa`, `dias_para_retorno`. Sem eval/JS/SQL. Estética/odonto usam copy neutro.
