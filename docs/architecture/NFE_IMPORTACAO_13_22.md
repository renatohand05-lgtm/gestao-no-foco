# Importação inteligente de NF-e de entrada — Sprint 13.22 (Gate 2)

## Objetivo

Importar XML de NF-e de fornecedores e direcionar itens para:

1. Entrada de estoque;
2. Consumo direto em OS (`peca_origem=compra`, sem aumentar estoque);
3. Operação mista (estoque + OS), com `q_estoque + q_os = q_nota`.

Sem OCR, sem SEFAZ, sem alteração de vendas/faturamento/DRE/Fluxo.

---

## Matriz de auditoria

| Entidade necessária | Estrutura existente | Reutilizar | Alteração necessária |
|---------------------|---------------------|------------|----------------------|
| Fornecedor | `fornecedores` + service | Sim | Match por `documento` (dígitos) |
| Produto | `produtos` (`sku`, `codigo_interno`, `codigo_barras`, `custo`) | Sim | EAN→`codigo_barras`; sem coluna `ean` |
| Estoque | `estoque_movimentacoes` + RPC | Sim | `origem=compra` + custo médio ponderado |
| OS itens | `ordem_servico_itens` | Sim | `peca_origem=compra`, custo real NF |
| Conta a Pagar | `contas_pagar` + parcelamento | Sim | Opcional, confirmação explícita |
| Plano/categoria/centro | tabelas + services | Sim | Obrigatórios se gerar CP |
| Storage | padrão inspeção | Padrão | Bucket `nfe-entrada` |
| Logger / toast | Sprint 13.21 | Sim | — |
| Domínio NF-e | — | Não | Tabelas + RPC atômica |

---

## Política oficial de custo (decisão CTO)

### Item destinado ao estoque

Atualizar `produtos.custo` pelo **custo médio ponderado**:

```text
novo_custo_medio =
  ((saldo_atual × custo_medio_atual) +
   (quantidade_entrada × custo_unitario_final))
  /
  (saldo_atual + quantidade_entrada)
```

Regras:

- Se `saldo_atual <= 0`, o novo custo = `custo_unitario_final`.
- `custo_unitario_final` já inclui rateio proporcional de frete, seguro, outras despesas, descontos e tributos incorporáveis ao custo (modelo do parser).
- Precisão decimal interna adequada; arredondar somente na apresentação (UI).

### Item destinado diretamente à OS

- Não aumenta estoque.
- Não cria entrada/saída artificiais.
- Não altera custo médio do produto.
- Registra na peça da OS o **custo real** da NF-e (`custo_unitario` / `valor_unitario` = `custo_unitario_final`).
- Mantém vínculo NF-e → item → produto → OS (`ordem_servico_item_id`).
- Não gera receita nem fatura automaticamente.

### Item misto

- Somente `quantidade_estoque` entra no cálculo do custo médio.
- A parcela `quantidade_os` usa o custo real da nota na OS.
- `quantidade_estoque + quantidade_os` deve ser exatamente igual à quantidade da NF-e.
- Sem movimentação duplicada (guarda por `estoque_movimentacao_id` / `ordem_servico_item_id`).

---

## Tabelas (migration `20260725_nfe_entrada_importacao.sql`)

- `notas_fiscais_entrada` — unique `(tenant_id, chave_acesso)` e `(tenant_id, xml_hash)` ativos
- `notas_fiscais_entrada_itens` — destinos + vínculos OS/estoque
- `notas_fiscais_entrada_eventos` — auditoria
- `fornecedor_produto_vinculos` — código fornecedor → produto ERP
- Bucket Storage `nfe-entrada` (privado, 2MB, XML)

RLS: membership em `tenant_members` em todas.

## RPC atômica (migration `20260725_nfe_processar_rpc.sql`)

Função: `processar_nfe_entrada_atomico(p_tenant_id, p_nota_id, p_user_id)`

Na **mesma transação**:

1. Valida membership, nota, fornecedor, produtos, destinos e quantidades
2. Cria entradas de estoque + atualiza custo médio (parcela estoque)
3. Adiciona peças diretas às OS (custo real; máx. 1 OS por item)
4. Gera Conta a Pagar somente se `gerar_conta_pagar` (sem pagamento)
5. Atualiza status da nota para `importada`
6. Registra eventos de auditoria

Qualquer falha → rollback completo. Idempotente se já `importada` ou se vínculos de movimento/item OS já existem.

Chamada apenas no servidor (`NfeEntradaService.processImport`); sem service role no frontend.

---

## Fluxo

Upload XML → parse XXE-safe → antiduplicidade → matching fornecedor/produto → conferência → `processImport` (RPC):

Limitação desta versão: **1 OS por item** (multi-OS por item = evolução futura).

---

## Segurança

- Parse server-side (`fast-xml-parser`, `processEntities: false`)
- Rejeita DOCTYPE/ENTITY/SYSTEM/PUBLIC
- Limite 2MB; apenas XML
- Logs sem XML completo (só prefixo de chave / contagens)
- tenant_id do servidor; storage privado
- RPC valida `auth.uid()` ∈ `tenant_members`

---

## Rotas

- `/[tenant]/estoque/notas-fiscais`
- `/[tenant]/estoque/notas-fiscais/nova`
- `/[tenant]/estoque/notas-fiscais/[id]`
- `/[tenant]/estoque/notas-fiscais/[id]/conferencia`

Acesso: botão no hub Estoque.

---

## Arquivos principais

- `supabase/migrations/20260725_nfe_entrada_importacao.sql`
- `supabase/migrations/20260725_nfe_processar_rpc.sql`
- `lib/nfe/nfe-xml-parser.ts`
- `lib/nfe/nfe-matching.ts`
- `lib/nfe/nfe-custo.ts`
- `lib/nfe/nfe-entrada-service.ts`
- `lib/nfe/actions.ts`
- `lib/estoque/estoque-service.ts` (médio ponderado em entradas manuais com custo)
- `components/nfe/*`
- `app/(app)/[tenant]/estoque/notas-fiscais/**`
- `types/nfe-entrada.ts`
- `scripts/nfe-gate2-preflight.mjs`
- `scripts/nfe-gate2-live-30.mjs`
