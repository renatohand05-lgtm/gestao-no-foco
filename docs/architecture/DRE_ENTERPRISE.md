# DRE Enterprise (Sprint 13.15 / 13.15.1)

Demonstração do Resultado por **competência**, alimentada uma única vez pelos lançamentos classificados do sistema.

## Princípio de fonte única

| Artefato | Significado | Origem |
| --- | --- | --- |
| Contas a Pagar | Obrigação | Título CP |
| Movimentação bancária | Pagamento (caixa) | Baixa / RPC de pagamento |
| **DRE** | Competência econômica | Vendas faturadas + CR avulsas (`venda_id IS NULL`) + CP |
| Fluxo de Caixa | Entradas/saídas de caixa | Movimentações + vencimentos previstos |

**Pagamento não gera nova despesa no DRE.**

## Estrutura oficial (linhas)

Receita bruta → deduções → receita líquida → CMV → margem → pessoal → operacionais → comerciais → **EBITDA** → depreciação → **EBIT** → financeiro → resultado antes dos impostos → impostos → **resultado líquido**.

Dashboard continua lendo `DreResumo.despesas_operacionais` = soma (pessoal + operacional + comercial). **Design Freeze:** Dashboard Executivo não foi redesenhado nesta sprint.

## Hierarquia gerencial (Sprint 13.15.2)

Dentro de **Despesas operacionais**, o demonstrativo expande:

1. Locação e ocupação  
2. Utilidades e infraestrutura  
3. Manutenção e serviços  
4. Despesas administrativas  
5. Tecnologia e sistemas  
6. Seguros e taxas operacionais  
7. Outras despesas operacionais  

Campo `dre_detalhe` (categoria/plano) decompõe visualmente e no drill-down.  
**Não altera totais**, EBITDA, competência nem fonte única.

Aluguel, condomínio, IPTU, água, energia, gás, internet, telefone, limpeza, manutenção recorrente e assinaturas/sistemas **não são investimento/CAPEX** — entram em opex (salvo custo direto configurado explicitamente, ex.: CMV).

### Migration hierarquia (manual)

Arquivo: `supabase/migrations/20260718_dre_hierarchy_detalhe.sql`

1. Supabase → SQL Editor  
2. Executar o arquivo  
3. Aplicar sugestões com confirmação no DRE / Categorias  

## Classificação

Ordem de resolução (`resolveDreLinha`):

1. `plano_contas.dre_linha` (preferencial)
2. `categorias_financeiras.dre_linha`
3. **null** → lançamento vai para **Pendente de classificação** (não entra no DRE)

Não há fallback silencioso por `tipo` receita/despesa.

### Sugestão segura para catálogo antigo

`suggestDreLinhaFromName` + action **Aplicar sugestões DRE** (Categorias):

- só preenche onde `dre_linha IS NULL`
- nunca sobrescreve classificação existente
- nomes sem regra conhecida ficam pendentes (relatório na UI / retorno `pendingCount`)

Mapeamentos de exemplo: água/energia/aluguel → operacionais; salários/pró-labore/encargos/férias/13º → pessoal; marketing → comerciais; peças/CMV → cmv; juros/tarifas → financeiras; depreciação → depreciacao_amortizacao; vendas → receita_bruta; impostos/devoluções → deducoes.

## Não classificados

Painel **Pendente de classificação** no DRE:

- quantidade + valor total
- CTA “Corrigir”
- não soma em nenhuma linha
- alerta: impede fechamento definitivo conceitual da competência (não há módulo formal de fechamento ainda)

## Rateio

Tabela `contas_pagar_rateios` (soft delete, tenant_id, RLS).

- CRUD no formulário de Contas a Pagar (criar/editar/remover linhas; remover todas = sem rateio)
- soma = 100%; sem centro duplicado; centros ativos do mesmo tenant
- valores com fechamento de centavos (`allocateRateioValues`)
- DRE distribui por share; filtro de centro usa o centro do rateio
- conta cancelada não edita

## Recorrência

Tabela `despesas_recorrentes` + `contas_pagar.despesa_recorrente_id`.

UI: `/financeiro/despesas-recorrentes`

- criar / editar (próximas) / pausar / retomar / encerrar / duplicar / soft delete
- gerar próxima ocorrência → **só Conta a Pagar**
- anti-duplicidade: série + competência
- série ≠ ocorrência; CPs já geradas não são reescritas
- ciclo suportado: **mensal**

## Competência × caixa

| Evento | DRE | Fluxo |
| --- | --- | --- |
| CP competência julho, paga em agosto | julho | agosto (movimento) |
| Pagamento / baixa | sem nova despesa | saída |
| Estorno de baixa | inalterado (CP permanece) | entrada/estorno de caixa |
| Cancelamento CP | fora do DRE (`status ≠ cancelado`) | sem obrigação |
| Pagamento parcial | valor integral por competência | só valores baixados |
| Parcelamento | cada parcela com competência própria | cada baixa na sua data |

## Status financeiros (comportamento)

| Status | DRE | Fluxo | Competência / data |
| --- | --- | --- | --- |
| aberto | sim (se classificado) | previsto no vencimento | competência do título |
| vencido (exibição) | sim | previsto/atrasado | idem |
| parcial | sim (valor do título) | caixa só do pago | idem |
| pago | sim | caixa na data_pagamento | competência ≠ pagamento |
| cancelado | não | não | — |
| previsto / provisionado | n/a no modelo atual (usar aberto) | — | — |
| estornado | n/a como status CP; estorno é movimento | corrige caixa | — |

## Duplicidade — chaves econômicas

| Risco | Chave / regra |
| --- | --- |
| Conta + pagamento | DRE lê CP; Fluxo lê movimentação |
| Parcela + “mãe” | só parcelas em `contas_pagar`; sem título fantasma |
| Recorrência + ocorrência | `despesa_recorrente_id` + `data_competencia` unique lógico |
| Estorno + novo | estorno não recria CP |
| Rateio + integral | com rateio ativo, não soma centro único + rateio |
| CR + venda faturada | CR no DRE exige `venda_id IS NULL` |
| Manual + baixa automática | mesma RPC/source de movimentação |

## Drill-down

Clique na linha do demonstrativo → lista de origens com descrição, fornecedor, categoria, plano, competência, vencimento, pagamento, centro, rateio, valor, status, documento, origem e filtros locais.

## RLS

Policies `tenant_members` em `contas_pagar_rateios` e `despesas_recorrentes`.  
Services sempre usam `tenant_id` do `requireTenant` (servidor), nunca do client.

## Migration (manual — não rodar em produção sem revisão)

Arquivo: `supabase/migrations/20260717_dre_enterprise_classification.sql`

### Procedimento de implantação

1. Backup / snapshot do projeto Supabase (opcional mas recomendado).
2. Abrir **SQL Editor**.
3. Colar o conteúdo integral do arquivo e executar.
4. Confirmar criação de colunas `dre_linha`, tabelas de rateio/recorrência e policies.
5. Em Categorias → **Aplicar sugestões DRE**.
6. Revisar pendentes manualmente no formulário da categoria/plano.
7. Validar um título de água/salário no DRE da competência.

Idempotente: `IF NOT EXISTS`, `DROP POLICY IF EXISTS`, não apaga dados.

## Testes de negócio (checklist manual)

Validar em cada cenário: CP/CR · DRE · Fluxo · centro · drill · sem duplicidade.

1. Água aberta → DRE opex na competência; Fluxo só se/quando pagar.  
2. Energia julho paga agosto → DRE julho; Fluxo agosto.  
3. Aluguel recorrente → gerar CP sem duplicar competência.  
4. Salário recorrente → `despesas_pessoal`.  
5–8. Encargos / pró-labore / férias / 13º → pessoal.  
9. Manutenção → operacionais.  
10. Marketing → comerciais.  
11. Parcelada → competências distintas.  
12. Parcialmente paga → DRE valor título; Fluxo parcial.  
13. Cancelada → fora do DRE.  
14. Estornada (baixa) → Fluxo estornado; DRE estável.  
15. Rateio 40/35/25 → 100%; drill por centro.  
16. Rateio inválido → formulário bloqueia.  
17. Categoria sem classificação → painel pendente.  
18. Centro outro tenant → rejeitado no rateio.  
19–20. Receita produto/serviço → receita bruta (venda/classificação).  
21. Imposto sobre venda → deduções.  
22. Juros (CP) → despesas financeiras.  
23. Depreciação → linha específica.  
24. Mês sem movimento → zeros + sem gaps forçados.  
25. Comparar duas competências no filtro do DRE.

## Limitações conhecidas

- Sem folha fiscal completa / eSocial  
- Sem módulo formal de “fechamento de mês” (alerta conceitual via gaps)  
- Recorrência só mensal  
- Tipos database TS ainda podem precisar regeneração para rateio/recorrência (`as never` temporário)  
- Usuário responsável no drill só se existir campo no futuro  

## Código principal

- `lib/dre/*` — motor puro  
- `lib/financeiro/dre-service.ts` — I/O + ledger  
- `lib/financeiro/conta-pagar-rateio.ts` / formulário rateio  
- `lib/financeiro/despesa-recorrente-service.ts` + UI  
- `lib/dre/dre-category-mapping.ts` — sugestões  
