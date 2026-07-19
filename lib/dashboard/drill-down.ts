import type { DashboardFilters } from "@/types/dashboard-executive";

export type DashboardDrillDownTarget =
  | "dre"
  | "fluxo"
  | "fluxo-previsto-entrada"
  | "fluxo-previsto-saida"
  | "contas-receber"
  | "contas-pagar"
  | "vendas"
  | "clientes"
  | "produtos"
  | "produtos-servicos"
  | "qualidade-operacional";

function appendCommonFilters(
  params: URLSearchParams,
  filters: DashboardFilters,
  options?: { includeStatus?: boolean },
) {
  params.set("dataDe", filters.dataDe);
  params.set("dataAte", filters.dataAte);

  if (filters.centroCusto) params.set("centroCusto", filters.centroCusto);
  if (filters.categoria) params.set("categoria", filters.categoria);

  if (options?.includeStatus !== false && filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
}

export function buildDashboardDrillDownHref(
  tenantSlug: string,
  target: DashboardDrillDownTarget,
  filters: DashboardFilters,
): string {
  const params = new URLSearchParams();

  switch (target) {
    case "dre":
      appendCommonFilters(params, filters, { includeStatus: false });
      return `/${tenantSlug}/financeiro/dre?${params}`;

    case "fluxo":
      appendCommonFilters(params, filters);
      if (filters.contaBancaria) params.set("conta", filters.contaBancaria);
      return `/${tenantSlug}/financeiro/fluxo-caixa?${params}`;

    case "fluxo-previsto-entrada":
      appendCommonFilters(params, filters);
      params.set("status", "previsto");
      if (filters.contaBancaria) params.set("conta", filters.contaBancaria);
      return `/${tenantSlug}/financeiro/fluxo-caixa?${params}`;

    case "fluxo-previsto-saida":
      appendCommonFilters(params, filters);
      params.set("status", "previsto");
      if (filters.contaBancaria) params.set("conta", filters.contaBancaria);
      return `/${tenantSlug}/financeiro/fluxo-caixa?${params}`;

    case "contas-receber":
      params.set("status", "aberto");
      if (filters.categoria) params.set("categoria", filters.categoria);
      params.set("vencimentoDe", filters.dataDe);
      params.set("vencimentoAte", filters.dataAte);
      return `/${tenantSlug}/financeiro/contas-receber?${params}`;

    case "contas-pagar":
      params.set("status", "aberto");
      if (filters.categoria) params.set("categoria", filters.categoria);
      params.set("vencimentoDe", filters.dataDe);
      params.set("vencimentoAte", filters.dataAte);
      return `/${tenantSlug}/financeiro/contas-pagar?${params}`;

    case "vendas":
      appendCommonFilters(params, filters, { includeStatus: false });
      return `/${tenantSlug}/vendas?${params}`;

    case "clientes":
      return `/${tenantSlug}/clientes`;

    case "produtos":
      params.set("tipo", "produto");
      if (filters.categoria) params.set("categoria", filters.categoria);
      return `/${tenantSlug}/produtos?${params}`;

    case "produtos-servicos":
      params.set("tipo", "servico");
      if (filters.categoria) params.set("categoria", filters.categoria);
      return `/${tenantSlug}/produtos?${params}`;

    case "qualidade-operacional":
      appendCommonFilters(params, filters, { includeStatus: false });
      return `/${tenantSlug}/ordens/qualidade-operacional?${params}`;

    default:
      return `/${tenantSlug}/dashboard`;
  }
}

export function buildRankingItemHref(
  tenantSlug: string,
  rankingType: "clientes" | "produtos" | "servicos" | "categorias",
  itemId: string,
  filters: DashboardFilters,
): string | undefined {
  switch (rankingType) {
    case "clientes":
      return `/${tenantSlug}/clientes/${itemId}`;
    case "produtos":
      // Produtos e serviços compartilham o módulo /produtos/[id]
      return `/${tenantSlug}/produtos/${itemId}`;
    case "servicos":
      // Serviço = item tipo serviço no mesmo catálogo (não há rota /servicos/[id])
      return `/${tenantSlug}/produtos/${itemId}`;
    case "categorias":
      return buildDashboardDrillDownHref(tenantSlug, "dre", {
        ...filters,
        categoria: itemId,
      });
    default:
      return undefined;
  }
}
