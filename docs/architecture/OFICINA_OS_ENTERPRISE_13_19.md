# Oficina OS Enterprise — Sprint 13.19

Módulo operacional completo para oficinas mecânicas, sobre a base já existente
(`veiculos`, `ordens_servico`, `ordem_servico_itens`, `retornos_servico`).

**Não altera** DRE, EBITDA, Fluxo, Contas a Pagar/Receber, baixas, estornos,
Dashboard Executivo, Design Freeze, migrations antigas.

## 1. Auditoria inicial (matriz)

| Área | Estado atual (pré-13.19) | Lacuna | Correção |
|---|---|---|---|
| Tabelas OS | `ordens_servico`, itens, veículos, retornos | Status pobre; sem checklist/diagnóstico/eventos | Migration 20260723 + domínio |
| Status | `aberta/em_execucao/concluida/cancelada` | Ciclo oficina incompleto | 16 status + transições |
| UI/CRUD | Stub `/ordens` | Sem abertura/detalhe | Listagem + nova + workspace |
| Veículos | Tabela básica | Campos oficina incompletos | Enrich + placa única/tenant |
| Orçamento | Itens simples | Sem aprovação/estoque por item | Campos de aprovação + estoque_status |
| Estoque | Motor estoque existente | Risco de baixa no orçamento | Reserva lógica; baixa só na venda |
| Faturamento | `venda_id` unused | Sem vínculo estável | `faturar` → VendaService |
| Financeiro | Vendas/CR/DRE/Fluxo | Não inventar motor | Reutiliza venda existente |
| Anexos | — | Ausente | `ordem_servico_anexos` |
| Histórico | — | Ausente | `ordem_servico_eventos` |
| RLS/tenant | Parcial nas tabelas base | Novas tabelas | RLS + asserts no service |

## 2. Migration (manual) — REPARO OBRIGATÓRIO

**Causa raiz do ERROR 42P01:** o arquivo original
`20260723_oficina_os_enterprise.sql` assumia que
`20260713_create_ordens_retornos.sql` já tinha criado `public.veiculos`.
Em ambientes sem essa base, o `ALTER TABLE public.veiculos` falhou.

**Não execute o original** (ele agora aborta de propósito).

Ordem correta no SQL Editor do Supabase:

1. `20260723_diag_oficina_os_enterprise.sql` — só leitura
2. `20260723_fix_oficina_os_enterprise.sql` — reparo idempotente
   (cria `veiculos` / `ordens_servico` / itens / retornos se ausentes +
   enrich 13.19 + RLS + `NOTIFY pgrst`)
3. Validar rotas `/ordens` e, se possível, `npm run audit:schema -- --live`

Nomes canônicos confirmados no repo:

- veículos → `public.veiculos` (não há tabela alternativa)
- OS → `public.ordens_servico`

## 3. Ciclo / status

Ver `lib/ordens/os-status.ts` — máquina de transições no servidor.

Fluxo típico:

`rascunho` → `aguardando_diagnostico` → `diagnostico_concluido` →
`aguardando_orcamento` → `aguardando_aprovacao` → `aprovado` /
`parcialmente_aprovado` → `em_execucao` → `pronto_para_entrega` →
`entregue` → `faturado`

Avanço por domínio (sem saltos): checklist, diagnóstico, orçamento, aprovação,
execução, entrega e faturamento usam `advanceTo()` sobre `OS_TRANSITIONS`.

Impede faturar OS `cancelado`. Impede cancelar OS já faturada.

## 4. Regras financeiras / estoque

| Evento | Receita | Estoque |
|---|---|---|
| Orçamento | Não | Não |
| Aprovação | Não | Reserva lógica (`reservado`) |
| Execução | Não | Não baixa física |
| Faturamento | Via **venda existente** | Baixa **uma vez** no motor da venda |
| Cancelamento pós-fatura | Bloqueado | — |

Itens **não aprovados** não entram em execução nem no faturamento.

## 5. Faturamento

`OrdemServicoService.faturar` → `createVendaService().create` + `.faturar` →
grava `ordens_servico.venda_id` e status `faturado`. Impede segunda fatura.
Contas a Receber / DRE / Fluxo seguem o motor atual da venda (sem alteração de fórmula).

## 6. Estrutura de código

```
lib/ordens/          os-status, validations, veiculo-service, ordem-servico-service, actions
components/ordens/   os-table, os-open-form, os-workspace (tabs)
app/.../ordens/      page, nova, [id], qualidade-operacional (preservada)
```

## 7. Rotas

- `/[tenant]/ordens` — listagem + filtros
- `/[tenant]/ordens/nova` — abertura
- `/[tenant]/ordens/[id]` — workspace por abas
- `/[tenant]/ordens/qualidade-operacional` — preservada

## 8. Limitações (explícitas)

- Sem agenda completa de mecânicos
- Sem folha de pagamento
- Sem integração real WhatsApp (canal registrado apenas)
- Sem módulo completo de compras (só `pendente_compra` + fornecedor sugerido)
- Upload de fotos: tabela de metadados pronta; storage path opcional
- KPIs receita/mecânico só preparados (dados parciais — não inventados)
- Permissões finas por papel: asserts no servidor + membership; UI de roles avançada fora do escopo

## 9. Checklist CTO (13.19 + 13.19.1)

- ✓ Migration fix + verify no Supabase
- ✓ `audit:schema --live` com tabelas OS
- ✓ Seletor de veículo existente + cadastro rápido na OS
- ✓ Ciclo UI: checklist → diagnóstico → orçamento → aprovação → execução → entrega → faturamento → retorno
- ✓ Orçamento ≠ receita; sem baixa de estoque no orçamento
- ✓ Faturamento via motor de venda; bloqueio de segunda fatura
- ✓ DRE / Fluxo / Design Freeze preservados
- ✓ Lint e build verdes

**Sprint 13.19.1 pronta para auditoria formal do CTO.**

**Sprint 13.20 não iniciada.**

## 10. Sprint 13.19.1 — fechamento operacional

- Seletor de veículos ativos do cliente (`OsVeiculoPicker`)
- Cadastro rápido em modal (`OsVeiculoQuickDialog`)
- Abertura da OS exige `veiculo_id` (não salva só texto de placa)
- Edição do veículo no resumo da OS (antes do faturamento)
- Aprovação parcial por checkboxes
- Faturamento bloqueado na UI com motivo quando status inválido / já faturada
- Tab Anexos: upload desabilitado com mensagem clara
- Feedback de sucesso/erro + botões disabled durante pending

## 11. Sprint 13.19.2 — fechamento total E2E

Ver release gate completo: `OFICINA_RELEASE_GATE_13_19_2.md`

Principais entregas:

- Edição de header da OS (`updateOsHeader`)
- Edição/remoção de itens pendentes no orçamento
- Checklist com observação persistida
- Execução com horas realizadas e cancelamento de item
- Histórico legível (`os-event-format.ts`)
- Histórico de previsões na aba Entrega
- Edição do cadastro mestre do veículo (`OsVeiculoEditDialog`)
- Confirmações em ações destrutivas (cancelar OS, faturar, remover item)
- Roteiro E2E manual: `docs/testing/OFICINA_E2E_MANUAL_13_19_2.md`

Pendências conscientes (módulos futuros):

- Upload real de storage (sem bucket configurado)
- Playwright E2E automatizado
- Permissões finas por papel (tenant-only hoje)
- Agenda completa de mecânicos / folha / compras completas

**Sprint 13.19.2 pronta para auditoria formal do CTO.**

**Sprint 13.20 não iniciada.**
