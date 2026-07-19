import { INTELLIGENCE_THRESHOLDS } from "@/lib/intelligence/alerts/thresholds";
import type {
  DashboardIntelligenceInput,
  IntelligenceAlert,
} from "@/types/intelligence";

export function buildIntelligenceAlerts(
  input: DashboardIntelligenceInput,
): IntelligenceAlert[] {
  const alerts: IntelligenceAlert[] = [];
  const base = `/${input.tenantSlug}`;

  if (input.kpis.ebitda < 0) {
    alerts.push({
      id: "ebitda-negativo",
      priority: "critical",
      category: "financeiro",
      title: "EBITDA negativo",
      description: `O EBITDA do período está em território negativo para ${input.tenantName}.`,
      recommendation:
        "Revise despesas operacionais no DRE e priorize receitas de maior margem.",
      href: `${base}/financeiro/dre`,
    });
  }

  const receita = input.kpis.receita_liquida;
  if (receita > 0) {
    const cmvPct = (input.kpis.cmv / receita) * 100;
    if (cmvPct > INTELLIGENCE_THRESHOLDS.cmvMetaPct) {
      alerts.push({
        id: "cmv-acima-meta",
        priority: "high",
        category: "financeiro",
        title: "CMV acima da meta",
        description: `CMV em ${cmvPct.toFixed(1)}% da receita líquida (meta ${INTELLIGENCE_THRESHOLDS.cmvMetaPct}%).`,
        recommendation:
          "Revise custos de produtos nas vendas faturadas e renegocie fornecedores.",
        href: `${base}/financeiro/dre`,
      });
    }
  }

  if (input.fluxo.saldo_projetado < 0) {
    alerts.push({
      id: "fluxo-negativo-previsto",
      priority: "critical",
      category: "financeiro",
      title: "Fluxo negativo previsto",
      description:
        "O saldo projetado (realizado + previsto) fecha o período abaixo de zero.",
      recommendation:
        "Antecipe recebíveis, renegocie pagamentos ou injete capital de giro.",
      href: `${base}/financeiro/fluxo-caixa`,
    });
  }

  if (input.contasReceber.total_vencido > 0) {
    alerts.push({
      id: "contas-receber-vencidas",
      priority: "high",
      category: "financeiro",
      title: "Contas a receber vencidas",
      description: `${input.contasReceber.quantidade_vencido} título(s) em atraso.`,
      recommendation:
        "Priorize cobrança dos títulos vencidos e atualize status de recebimento.",
      href: `${base}/financeiro/contas-receber?status=vencido`,
    });
  }

  if (input.contasPagar.total_vencido > 0) {
    alerts.push({
      id: "contas-pagar-vencidas",
      priority: "high",
      category: "financeiro",
      title: "Contas a pagar vencidas",
      description: `${input.contasPagar.quantidade_vencido} título(s) em atraso.`,
      recommendation:
        "Programe pagamentos urgentes para evitar juros e impacto no relacionamento.",
      href: `${base}/financeiro/contas-pagar?status=vencido`,
    });
  }

  if (input.estoqueBaixoCount > 0) {
    alerts.push({
      id: "estoque-baixo",
      priority: "medium",
      category: "estoque",
      title: "Estoque baixo",
      description: `${input.estoqueBaixoCount} produto(s) abaixo do estoque mínimo.`,
      recommendation:
        "Reponha itens críticos e ajuste o estoque mínimo se necessário.",
      href: `${base}/estoque`,
    });
  }

  if (input.produtosParadosCount > 0) {
    alerts.push({
      id: "produto-parado",
      priority: "medium",
      category: "estoque",
      title: "Produto parado",
      description: `${input.produtosParadosCount} produto(s) sem movimentação há ${INTELLIGENCE_THRESHOLDS.produtoParadoDias} dias ou mais.`,
      recommendation:
        "Avalie promoção, transferência ou revisão de compra desses itens.",
      href: `${base}/estoque`,
    });
  }

  if (
    input.concentracaoCliente.sharePct >=
      INTELLIGENCE_THRESHOLDS.concentracaoClienteMaxPct &&
    input.concentracaoCliente.clienteNome
  ) {
    alerts.push({
      id: "concentracao-cliente",
      priority: "medium",
      category: "comercial",
      title: "Alta concentração de faturamento",
      description: `${input.concentracaoCliente.clienteNome} concentra ${input.concentracaoCliente.sharePct.toFixed(1)}% do faturamento do período.`,
      recommendation:
        "Diversifique a carteira de clientes para reduzir risco comercial.",
      href: `${base}/clientes`,
    });
  }

  const vendas = input.comparisons.quantidade_vendas;
  if (
    vendas.previous > 0 &&
    vendas.current >= vendas.previous &&
    input.kpis.quantidade_vendas > 0
  ) {
    alerts.push({
      id: "meta-vendas-atingida",
      priority: "info",
      category: "meta",
      title: "Meta de vendas atingida",
      description:
        "A quantidade de vendas do período igualou ou superou o período anterior equivalente.",
      recommendation:
        "Mantenha o ritmo comercial e registre oportunidades de upsell.",
      href: `${base}/vendas`,
    });
  }

  return alerts;
}
