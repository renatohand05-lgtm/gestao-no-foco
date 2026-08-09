/**
 * Permissões de visualização do Estoque (shell + telas).
 * Arquivo leve — seguro no bootstrap do tab layout (não importar sections.tsx).
 */
export const STOCK_VIEW_PERMS = [
  "estoque.visualizar",
  "produtos.visualizar",
  "compras.visualizar",
  "fornecedores.visualizar",
  "supply.dashboard.visualizar",
  "dashboard.estoque",
] as const;

export type StockViewPerm = (typeof STOCK_VIEW_PERMS)[number];
