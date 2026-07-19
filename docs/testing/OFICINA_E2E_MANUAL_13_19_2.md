# Roteiro E2E Manual — Oficina OS 13.19.2

**Ambiente:** local (`npm run dev`) ou projeto Supabase de teste — **nunca produção**.

**Pré-requisitos:** migration `20260723_fix_oficina_os_enterprise.sql` aplicada; tenant de teste com cliente, produtos/serviços e forma de pagamento.

---

## 1. Login e acesso

| # | Passo | Resultado esperado | OK |
|---|---|---|---|
| 1.1 | Autenticar no tenant de teste | Sessão ativa | ☐ |
| 1.2 | Abrir `/[tenant]/ordens` | Listagem carrega sem erro | ☐ |

---

## 2. Veículo

| # | Passo | Resultado esperado | OK |
|---|---|---|---|
| 2.1 | Nova OS → selecionar cliente | Veículos do cliente listados | ☐ |
| 2.2 | Cadastrar veículo rápido (modal) | Veículo criado e auto-selecionado | ☐ |
| 2.3 | Tentar placa duplicada no tenant | Erro amigável, sem persistir | ☐ |
| 2.4 | Na OS aberta → Editar cadastro do veículo | Dados salvos no mestre | ☐ |

---

## 3. Abertura e edição da OS

| # | Passo | Resultado esperado | OK |
|---|---|---|---|
| 3.1 | Criar OS com cliente + veículo | OS em rascunho, número gerado | ☐ |
| 3.2 | Editar reclamação/km no Resumo | Persiste após refresh | ☐ |
| 3.3 | Trocar veículo antes de faturar | Evento no histórico com labels legíveis | ☐ |
| 3.4 | Avançar status com confirmação | Transição válida apenas | ☐ |

---

## 4. Checklist e diagnóstico

| # | Passo | Resultado esperado | OK |
|---|---|---|---|
| 4.1 | Marcar item checklist OK + observação | Salva status e obs. | ☐ |
| 4.2 | Registrar diagnóstico | Salvo; status avança se aplicável | ☐ |
| 4.3 | Verificar financeiro | Sem venda/CR criados | ☐ |

---

## 5. Orçamento

| # | Passo | Resultado esperado | OK |
|---|---|---|---|
| 5.1 | Adicionar serviço + peça (estoque) | Itens listados; total recalculado | ☐ |
| 5.2 | Editar item pendente | Valores atualizados | ☐ |
| 5.3 | Remover item pendente | Soft delete; total recalculado | ☐ |
| 5.4 | Verificar estoque físico | **Nenhuma** movimentação | ☐ |

---

## 6. Aprovação e execução

| # | Passo | Resultado esperado | OK |
|---|---|---|---|
| 6.1 | Aprovar parcialmente (checkboxes) | Aprovados vs reprovados corretos | ☐ |
| 6.2 | Peça estoque aprovada → `reservado` | Apenas status lógico | ☐ |
| 6.3 | Tentar executar item reprovado | Bloqueado no servidor | ☐ |
| 6.4 | Iniciar → Concluir com horas | `horas_realizadas` persistido | ☐ |

---

## 7. Entrega e faturamento

| # | Passo | Resultado esperado | OK |
|---|---|---|---|
| 7.1 | Alterar previsão com motivo | Histórico visível na aba Entrega | ☐ |
| 7.2 | Concluir entrega | Status `entregue` | ☐ |
| 7.3 | Faturar (confirmar diálogo) | `venda_id` preenchido; link para venda | ☐ |
| 7.4 | Verificar Conta a Receber | Uma CR pela venda | ☐ |
| 7.5 | Tentar segundo faturamento | Bloqueado UI + servidor | ☐ |
| 7.6 | Verificar estoque | Baixa **uma vez** (via venda) | ☐ |

---

## 8. Retorno e histórico

| # | Passo | Resultado esperado | OK |
|---|---|---|---|
| 8.1 | Registrar retorno/garantia | `retornos_servico` criado; OS original intacta | ☐ |
| 8.2 | Aba Histórico | Eventos legíveis (sem UUID/JSON bruto) | ☐ |

---

## 9. Segurança

| # | Passo | Resultado esperado | OK |
|---|---|---|---|
| 9.1 | Acessar OS de outro tenant (ID manual) | 404 ou erro amigável | ☐ |
| 9.2 | Cancelar OS faturada | Bloqueado com mensagem sobre estorno | ☐ |

---

## 10. Regressão rápida

| # | Módulo | Resultado esperado | OK |
|---|---|---|---|
| 10.1 | Dashboard | Carrega normalmente | ☐ |
| 10.2 | Vendas / Financeiro | Sem alteração de comportamento | ☐ |
| 10.3 | Clientes | CRUD ok | ☐ |

---

**Limitação documentada:** automação Playwright não instalada nesta sprint. Este roteiro substitui E2E automatizado até infraestrutura de teste ser aprovada.

**Executor:** _______________ **Data:** _______________ **Resultado geral:** ☐ Aprovado ☐ Reprovado
