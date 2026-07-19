/** Tooltips de cálculo — descrevem a fonte DRE/Fluxo sem redefinir fórmulas. */

export const FI_TOOLTIPS = {
  receita_bruta:
    "Soma da receita bruta do DRE por competência (vendas faturadas + títulos classificados). Fonte: DRE.",
  receita_liquida:
    "Receita bruta menos deduções (descontos e similares). Fonte: DRE — não altera caixa.",
  cmv: "Custo das mercadorias/serviços vendidos no período de competência. Fonte: DRE.",
  lucro_bruto:
    "Margem de contribuição do DRE (receita líquida − CMV). Exibido aqui como Lucro Bruto operacional.",
  despesas_operacionais:
    "OPEX consolidado: pessoal + operacionais + comerciais (competência). Fonte: DRE.",
  ebitda:
    "Margem de contribuição menos despesas operacionais consolidadas. Fonte: DRE.",
  ebit: "EBITDA menos depreciação/amortização. Fonte: DRE.",
  resultado_liquido:
    "Resultado final do DRE após financeiras e impostos sobre o lucro. Fonte: DRE.",
  margem_bruta:
    "Lucro bruto ÷ receita líquida × 100. Derivação de apresentação sobre totais do DRE.",
  margem_ebitda:
    "EBITDA ÷ receita líquida × 100. Derivação de apresentação sobre totais do DRE.",
  margem_liquida:
    "Resultado líquido ÷ receita líquida × 100. Derivação de apresentação sobre totais do DRE.",
  break_even:
    "Estimativa determinística: despesas operacionais ÷ margem de contribuição percentual (quando > 0). Não altera o DRE.",
  ticket_medio:
    "Faturamento total de vendas faturadas no período ÷ quantidade de vendas. Fonte: vendas (mesmo critério do Dashboard).",
  receita_por_cliente:
    "Receita líquida do DRE ÷ quantidade de clientes ativos (cadastro). Aproximação gerencial.",
  receita_por_os:
    "Aguardando vínculo receita↔ordem de serviço publicado no domínio operacional. Sem estimativa inventada.",
  receita_por_mecanico:
    "Aguardando vínculo receita↔mecânico. Qualidade operacional mede retornos, não geração de receita.",
  receita_por_consultor:
    "Aguardando ranking de vendedores/consultores (ainda não publicado no painel comercial).",
  receita_por_unidade:
    "Maior faturamento por centro de custo no ranking comercial do período (quando disponível).",
} as const;
