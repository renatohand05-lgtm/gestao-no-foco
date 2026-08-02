# Sprint 27.8.2 — Labels, serviços e meta no Dashboard

**Data:** 2026-08-01 / 2026-08-02  
**Tenant:** `teste-renato-01`  
**Classificação:** **APROVADO EM RUNTIME**

Sem commit · sem push · sem deploy · sem SQL automático.

---

## Causa raiz dos UUIDs

Base UI `<Select.Value>` renderiza o **valor cru** quando `Select.Root` não recebe `items` e/ou o label não é resolvido explicitamente.

Efeito: centro de custo, produto/serviço, forma de pagamento e contas apareciam como UUID no trigger fechado (mesmo com `option.label` correto na lista).

Correção:

1. `GFSelect` passa `items={options}` ao Root  
2. `Select.Value` usa `resolveOptionLabel` (nunca UUID)  
3. `value=""` tratado como sem seleção → placeholder (não “Registro indisponível”)  
4. Item ausente → “Registro indisponível”  
5. Loading → “Carregando…”

Arquivos: `components/gf/gf-select.tsx`, `components/gf/gf-combobox.tsx`, `lib/gf/resolve-option-label.ts`

---

## Componentes / campos afetados

| Área | Correção |
|---|---|
| GFSelect / GFCombobox | resolução de label + items |
| Forma de pagamento | `getPaymentMethodLabel` / `formatFormaPagamentoLabel` |
| Centro de custo | nome + description `Código:` |
| Produto/serviço (venda) | `buildCatalogItemSelectLabel` |
| Listagem serviços | colunas comerciais (sem estoque) |
| Detalhe serviço | custo MO, sugerido, tempo, equipe |
| Meta dashboard | `resolveMetaMensalVigente` + ECC sem mascarar |

---

## Pagamentos

Helper: `lib/financeiro/payment-method-label.ts`

- `cartao_credito` → Cartão de crédito  
- `pix` → Pix  
- catálogo `nome` prevalece quando amigável  
- códigos curtos em MAIÚSCULAS (`CREDITO`, `PIX`) usam o mapa do `tipo`  


---

## Serviços — listagem e detalhe

- Colunas: custo MO, preço atual, sugerido, margem `(preço-custo)/preço`, tempo, unidade  
- Preço zero → margem “Indisponível”  
- Filtros custo/preço zerado na aba Serviços  
- Ordenação por custo / preço / sugerido / categoria  

---

## Meta no Dashboard

### Causa da meta “não aparecer”

1. Query antiga exigia `centro_custo_id IS NULL` — meta salva **com centro** não era encontrada no cockpit geral.  
2. ECC `buildCommandGoals` podia usar **percentual** como se fosse valor da meta.  
3. Ausência era tratada de forma ambígua.

### Correção

- Fonte canônica: `lib/metas/resolve-meta-mensal.ts`  
  - match centro → fallback meta geral → `nao_cadastrada` (valor `null`, nunca `0`)  
- `vendas-dia-service` + `resumo-vendas-mes-service` usam o resolver  
- ECC: meta ausente → “Indisponível”; atingimento não divide por zero  
- `revalidatePath` em dashboard, analytics, inteligência ao salvar meta  

Evidência runtime: Executive Brief mostra “Meta do mês em 4,9% com R$ 6.532,50 realizados.”

---

## Screenshots

`docs/testing/evidence/27-8-2/` — **11 shots · capture 11 PASS · 0 FAIL**

- centro-custo / forma-pagamento / seletor produto-serviço  
- tabela serviços / detalhe  
- meta cadastrada / dashboard dark·light·notebook·mobile  

---

## Testes

| Suite | Resultado |
|---|---|
| `test:sprint-27-8-2` | **58 PASS · 0 FAIL** |
| `test:sprint-27-8` | 57 PASS · 0 FAIL |
| lint | 0 errors |
| build | OK |
| rbac / finance / supply / inventory / analytics / RC | 0 FAIL |

---

## Confirmações

- Sem UUID como label principal  
- Sem meta ausente = R$ 0,00  
- Sem alteração de identidade visual  
- Sem alteração de cálculos financeiros canônicos (DRE/ledger)  
- Sem commit / push / deploy / SQL automático  

### Limitações / pendências

- Selects nativos restantes (fora do escopo GFSelect) ainda podem mostrar painel SO  
- Meta do **dia** “Sem meta” é independente da meta **mensal** (rateio/override diário)  
- Uso em vendas/OS no detalhe do serviço e histórico de alterações: não expandido além dos campos comerciais pedidos  

---

## Classificação

**APROVADO EM RUNTIME**
