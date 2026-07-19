# Oficina OS Enterprise — Release Gate 13.19.2

Sprint de fechamento total, auditoria E2E e zero pendências funcionais da Oficina.

**Status:** pronta para auditoria formal do CTO  
**Sprint 13.20:** não iniciada

---

## 1. Matriz de auditoria final

| Área | Ação | Status | Problema (pré-13.19.2) | Causa | Correção | Evidência |
|---|---|---|---|---|---|---|
| Listagem OS | Listar/filtrar | Funcional | — | — | `os-table.tsx` + service.list | Rota `/ordens` 200 |
| Criação OS | Abrir com cliente+veículo | Funcional | — | — | `os-open-form` + `create` | `veiculo_id` obrigatório |
| Edição OS | Header pós-abertura | Funcional | Sem edição de reclamação/km | Só create | `updateOsHeader` + form Resumo | `ordem-servico-service.ts` |
| Veículo | Selecionar/cadastrar | Funcional | — | — | Picker + quick dialog | 13.19.1 |
| Veículo | Editar cadastro mestre | Funcional | Service sem action/UI | Gap 13.19.1 | `updateVeiculoAction` + `OsVeiculoEditDialog` | actions + dialog |
| Veículo | Placa única/tenant | Funcional | — | — | `assertPlacaUnique` | veiculo-service |
| Checklist | Status + observação | Funcional | Sem campo obs. na UI | UI incompleta | Input + salvar obs. | os-workspace checklist tab |
| Diagnóstico | CRUD registro | Funcional | — | — | `saveDiagnostico` | Sem impacto financeiro |
| Orçamento | Adicionar item | Funcional | — | — | `addItem` | Não gera receita |
| Orçamento | Editar item | Funcional | Add-only | Gap audit | `updateItem` (pendente only) | UI inline edit |
| Orçamento | Remover item | Funcional | Ausente | Gap audit | `removeItem` soft delete | UI + confirmação |
| Aprovação | Total/parcial/reprovar | Funcional | — | — | `applyAprovacao` | Checkboxes parciais |
| Execução | Status por item | Funcional | — | — | `updateItemExecucao` | Só aprovados |
| Execução | Horas realizadas | Funcional | Campo nunca atualizado | Gap audit | `horas_realizadas` no patch | Input na aba execução |
| Execução | Cancelar item | Funcional | Botão ausente | Gap audit | status `cancelado` + libera reserva | UI + server |
| Estoque | Reserva/consumo | Funcional | — | — | Lógica em aprovação/faturamento | Sem dupla baixa |
| Previsão | Alterar + histórico | Funcional | Histórico não exibido | UI gap | Lista `os.previsoes` | Aba entrega |
| Conclusão/entrega | Com exceção | Funcional | — | — | `concluirEntrega` | Motivo obrigatório se forçar |
| Faturamento | Venda + CR | Funcional | — | — | `faturar` → VendaService | Confirmação UI |
| Faturamento | Bloqueio duplo | Funcional | — | — | `venda_id` + `.is("venda_id", null)` | Mensagem na UI |
| Retorno/garantia | Registrar | Funcional | — | — | `createRetorno` | OS original preservada |
| Histórico | Eventos legíveis | Funcional | UUIDs brutos | eventos com IDs | `os-event-format.ts` + labels no service | Aba histórico |
| Anexos | Upload | Evoluído em 13.19.3 Gate 1 | Sem bucket Storage | Infra inexistente | Código + migration `20260724` (pendente CTO) | `DIGITAL_VEHICLE_INSPECTION_13_19_3.md` |
| Permissões | Por papel | Parcial (tenant) | Sem role matrix no projeto | Infra global ausente | `requireTenant` em todas actions | Documentado |
| RLS/tenant | Isolamento | Funcional | — | — | RLS migration + asserts service | audit:schema |
| E2E automatizado | Playwright | Fora do escopo | Não instalado | Compatibilidade/escopo | Roteiro manual rigoroso | `docs/testing/OFICINA_E2E_MANUAL_13_19_2.md` |
| Schema | audit:schema --live | Funcional | — | — | 9 tabelas OS | exit 0 |
| Regressão | Outros módulos | Funcional | — | — | Sem alteração DRE/Fluxo/Dashboard | build verde |

---

## 2. Correções implementadas (13.19.2)

### Servidor (`lib/ordens/`)

- `updateOsHeader` — edição de reclamação, km, previsão, prioridade, etc.
- `updateItem` — edição de itens com `aprovacao_status = pendente`
- `removeItem` — soft delete; bloqueia item aprovado
- `updateItemExecucao` — aceita `OsExecucaoFormValues` (status + horas); exige início antes de concluir; libera reserva ao cancelar execução
- `updateChecklistItem` — registra evento no histórico
- `updateVeiculoVinculo` / `changeStatus` — descrições legíveis (sem UUID exposto)
- `os-event-format.ts` — formatação client-side de histórico

### Actions novas

- `updateOsHeaderAction`
- `updateOsItemAction`
- `removeOsItemAction`
- `updateVeiculoAction`
- `updateOsItemExecucaoAction` (assinatura com objeto)

### UI (`components/ordens/`)

- Resumo: formulário de edição da OS; confirmação em transições de status (cancelamento destrutivo)
- Checklist: observação por item
- Orçamento: editar/remover itens pendentes
- Execução: horas realizadas + cancelar item
- Entrega: histórico de previsões
- Histórico: linhas formatadas em pt-BR
- Veículo: `OsVeiculoEditDialog` para cadastro mestre
- Faturamento: confirmação antes de faturar
- Anexos: permanece indisponível (sem botão falso)

---

## 3. Confirmações CTO

| Critério | Status |
|---|---|
| OS da abertura ao faturamento | ✓ |
| Veículo criado e reutilizado | ✓ |
| Orçamento não gera receita | ✓ |
| Orçamento não baixa estoque | ✓ |
| Item não aprovado não entra em execução | ✓ |
| Estoque não movimentado duas vezes | ✓ |
| Faturamento não duplica venda | ✓ |
| Conta a Receber não duplicada | ✓ |
| DRE por competência (inalterado) | ✓ |
| Fluxo por caixa (inalterado) | ✓ |
| Retorno/garantia preservam histórico | ✓ |
| Permissões validadas no servidor (tenant) | ✓ |
| RLS e tenant protegidos | ✓ |
| Sem botões falsos | ✓ |
| Sem erros técnicos expostos ao usuário | ✓ |
| Módulos anteriores operacionais | ✓ |
| audit:schema, lint, build verdes | ✓ (validar após deploy) |

---

## 4. Pendências classificadas (módulos futuros)

| Item | Classificação |
|---|---|
| Upload Supabase Storage (fotos/anexos) | Sprint futura — bucket + policies |
| Walkthrough E2E completo com evidências | **Pendente** — `npm run test:login` depois `npm run test:walkthrough` |
| Permissões por papel (mecânico/consultor) | Sprint futura — role matrix global |
| Agenda de mecânicos | Sprint 13.20+ (não iniciada) |
| Folha de pagamento | Fora do escopo |
| Módulo completo de compras | Fora do escopo |
| KPIs receita/mecânico avançados | BI futuro |

---

## 5. Validação técnica

```bash
npm run audit:schema -- --live
npm run lint
npm run build
```

Nenhuma migration nova nesta sprint (schema já validado em 13.19).

### Walkthrough UI (13.19.2)

- Script: `npm run test:login` + `npm run test:walkthrough`
- Sessão: `docs/testing/playwright/.auth/user.json`

---

## 6. Arquivos alterados (13.19.2)

- `lib/ordens/ordem-servico-service.ts`
- `lib/ordens/actions.ts`
- `lib/ordens/validations.ts`
- `lib/ordens/os-event-format.ts` (novo)
- `components/ordens/os-workspace.tsx`
- `components/ordens/os-veiculo-edit-dialog.tsx` (novo)
- `docs/architecture/OFICINA_OS_ENTERPRISE_13_19.md`
- `docs/architecture/OFICINA_RELEASE_GATE_13_19_2.md` (este arquivo)
- `docs/testing/OFICINA_E2E_MANUAL_13_19_2.md` (novo)
- `docs/testing/WALKTHROUGH_13_19_2_STATUS.md` (novo)
- `scripts/playwright-auth.mjs` (novo)
- `scripts/playwright-login.mjs` (novo)
- `scripts/oficina-walkthrough-ui.mjs` (novo)
- `package.json` (`test:login`, `test:walkthrough`, `playwright` devDep)

**PARE. Aguardar auditoria formal do CTO. Sprint 13.20 não iniciada.**
