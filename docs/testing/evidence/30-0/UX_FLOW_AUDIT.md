# Sprint 30.0 — UX Flow Audit

**Método:** observação autenticada + estrutura de rotas/UI · sem mutações destrutivas nesta sprint.

## Fluxos avaliados

| Fluxo | Passos perc. | Clareza | Feedback | Prevenção erro | Recuperação | Consistência | Esforço | Velocidade | Mobile | Nota | Achados |
|-------|--------------|---------|----------|----------------|-------------|--------------|---------|------------|--------|------|---------|
| Criar cliente | 4–6 | 8 | 7 | 7 | 7 | 8 | médio | boa | ok | **7.5** | Formulário completo; atenção a campos CRM enterprise |
| Criar lead | 3–5 | 8 | 7 | 7 | 7 | 8 | médio | boa | ok | **7.5** | Sobreposição lead/cliente no funil único |
| Converter lead | 2–4 | 7 | 7 | 7 | 6 | 7 | médio | boa | médio | **6.9** | Precisa de próximo passo explícito pós-conversão |
| Criar oportunidade | 4–6 | 8 | 8 | 7 | 7 | 8 | médio | boa | médio | **7.4** | Runtime OK pós-schema |
| Mover Kanban | 1–2 | 8 | 7 | 6 | 7 | 8 | baixo | boa | fraco | **7.0** | DnD desktop; mobile limitado; empty columns sem CTA |
| Criar orçamento | 5–8 | 7 | 7 | 7 | 6 | 7 | alto | média | médio | **6.6** | Muitos campos; risco de scroll longo |
| Converter orçamento | 2–3 | 7 | 7 | 7 | 6 | 7 | médio | média | médio | **6.7** | Confirmação e destino pós-conversão devem ser óbvios |
| Criar venda | 5–8 | 7 | 7 | 7 | 7 | 7 | alto | média | médio | **6.8** | Produto vs serviço + pagamento + CC |
| Criar OS | 6–10 | 6 | 7 | 7 | 6 | 5 | alto | média | fraco | **6.0** | Fluxo rico mas enviesado a oficina/placa |
| Adicionar produto/serviço | 2–4 | 8 | 8 | 7 | 7 | 8 | baixo | boa | ok | **7.5** | Seletor melhorado nas sprints 27–28 |
| Cadastrar serviço | 3–5 | 8 | 8 | 7 | 7 | 8 | baixo | boa | ok | **7.5** | Hub produtos/serviços |
| Importar serviços | 4–6 | 8 | 8 | 8 | 7 | 8 | médio | boa | n/a | **7.7** | Preview/qualidade — força da plataforma |
| Comprar / pedido | 5–8 | 7 | 7 | 7 | 6 | 7 | médio | média | médio | **6.8** | Homologado; loading skeleton longo |
| Receber mercadoria | 3–5 | 7 | 7 | 7 | 6 | 7 | médio | média | médio | **6.7** | Vínculo estoque existe |
| Movimentar estoque | 3–5 | 7 | 7 | 7 | 7 | 7 | médio | boa | médio | **7.0** | |
| Agendar | 3–5 | 7 | 7 | 6 | 6 | 7 | médio | boa | fraco | **6.6** | Calendário denso no mobile |
| Lançar conta | 4–6 | 8 | 8 | 8 | 7 | 8 | médio | boa | ok | **7.6** | Financeiro maduro |
| Conciliar | 4–7 | 7 | 7 | 7 | 6 | 7 | alto | média | fraco | **6.6** | Requer foco desktop |
| Analisar DRE | 2–4 | 8 | 8 | 8 | 7 | 8 | baixo | boa | médio | **7.6** | Comparativo mensal disponível; chrome acima |
| Analisar caixa | 2–4 | 8 | 8 | 7 | 7 | 8 | baixo | boa | médio | **7.5** | |
| Cadastrar / acompanhar meta | 3–5 | 8 | 8 | 7 | 7 | 8 | baixo | boa | ok | **7.6** | |
| Exportar relatório | 2–4 | 7 | 7 | 7 | 6 | 7 | baixo | média | n/a | **6.8** | Disperso entre Relatórios/Analytics/Dashboard |
| Inteligência Executiva | 2–5 | 7 | 7 | 8 | 7 | 7 | baixo | média | ok | **7.0** | Hub esparso; copiloto é o valor |

## Padrões transversais (problemas)

1. **Chrome de “Apresentação” (Normal / Executivo / Comercial / Tela Cheia)** aparece em quase todas as telas — rouba viewport, aumenta esforço cognitivo e atrasa o conteúdo útil (pior no mobile).
2. **Subnavegação financeira em grade** na área do DRE — útil para power users, barreira para leitura executiva rápida.
3. **Empty states fracos** em colunas Kanban vazias (sem CTA / próxima ação).
4. **Próximo passo** após conversões (lead→oportunidade, orçamento→venda) nem sempre é explícito.
5. **Skeleton prolongado** em Compras/Analytics no momento do screenshot (~1,4s wait) — percepção de incompletude.
6. **Ações de equipe** em Configurações sem destino real (“Convidar membro”).

## Fluxos mais fortes

- Importação de serviços / qualidade de dados  
- Lançamentos financeiros (AP/AR)  
- Análise DRE / caixa  
- Metas  
- Cadastro cliente + seletor produto/serviço  

## Fluxos mais fracos

- OS completa (vertical oficina)  
- Admin de usuários/permissões (ausente)  
- Analytics como jornada executiva  
- Centro de Operações (latência)  
- Kanban mobile  
