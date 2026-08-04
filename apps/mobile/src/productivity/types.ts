export type ProductivityEntityType =
  | "cliente"
  | "veiculo"
  | "ordem_servico"
  | "produto"
  | "fornecedor"
  | "compra"
  | "conta"
  | "oportunidade"
  | "modulo"
  | "comando";

export type RecentItem = {
  id: string;
  type: ProductivityEntityType;
  title: string;
  subtitle?: string | null;
  route: string;
  opensWeb?: boolean;
  at: number;
};

export type FavoriteItem = {
  id: string;
  type: ProductivityEntityType;
  title: string;
  subtitle?: string | null;
  route: string;
  opensWeb?: boolean;
  order: number;
};

export type CommandItem = {
  id: string;
  label: string;
  group: string;
  route?: string;
  opensWeb?: boolean;
  action?: "logout" | "switch-tenant" | "switch-branch" | "toggle-theme" | "open-search" | "open-scanner";
  permissions: string[];
};

export type AdaptiveProfile =
  | "GESTOR"
  | "MECANICO"
  | "CONSULTOR"
  | "FINANCEIRO"
  | "ESTOQUE"
  | "GERAL";

export type DeepLinkResolution =
  | { ok: true; route: string; opensWeb: boolean }
  | { ok: false; reason: string };
