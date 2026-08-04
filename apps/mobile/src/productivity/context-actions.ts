import type { CommandItem } from "@/productivity/types";

function hasAny(permissions: readonly string[], keys: string[]): boolean {
  if (permissions.includes("*")) return true;
  return keys.some((k) => permissions.includes(k));
}

export type ContextScreen =
  | "work-order"
  | "customer"
  | "product"
  | "vehicle"
  | "home";

/**
 * Ações contextuais somente leitura/navegação — mutações sensíveis ficam nas telas dedicadas.
 */
export function contextActionsFor(
  screen: ContextScreen,
  permissions: readonly string[],
  ids: { entityId?: string; relatedId?: string } = {},
): CommandItem[] {
  const id = ids.entityId ?? "";
  switch (screen) {
    case "work-order":
      return [
        {
          id: "wo-checklist",
          label: "Abrir checklist",
          group: "OS",
          route: id ? `/operacao/ordens/${id}` : "/operacao",
          permissions: ["os.visualizar", "os.checklist"],
        },
        {
          id: "wo-gallery",
          label: "Abrir galeria",
          group: "OS",
          route: id ? `/operacao/ordens/${id}` : "/operacao",
          permissions: ["os.visualizar", "os.anexos"],
        },
        {
          id: "wo-customer",
          label: "Ver cliente",
          group: "OS",
          route: ids.relatedId
            ? `/operacao/clientes/${ids.relatedId}`
            : "/operacao/clientes",
          permissions: ["clientes.visualizar", "os.visualizar"],
        },
        {
          id: "wo-portal",
          label: "Abrir no portal",
          group: "OS",
          opensWeb: true,
          route: id ? `/ordens/${id}` : "/ordens",
          permissions: ["os.visualizar"],
        },
      ].filter((c) => c.permissions.length === 0 || hasAny(permissions, c.permissions));
    case "customer":
      return [
        {
          id: "cu-vehicles",
          label: "Ver veículos",
          group: "Cliente",
          route: "/operacao/veiculos",
          permissions: ["os.visualizar", "clientes.visualizar"],
        },
        {
          id: "cu-os",
          label: "Ver OS",
          group: "Cliente",
          route: "/operacao/ordens",
          permissions: ["os.visualizar"],
        },
        {
          id: "cu-crm",
          label: "Abrir CRM",
          group: "Cliente",
          route: "/crm",
          permissions: ["crm.visualizar", "clientes.visualizar"],
        },
      ].filter((c) => hasAny(permissions, c.permissions));
    case "product":
      return [
        {
          id: "pr-stock",
          label: "Ver estoque",
          group: "Produto",
          route: id ? `/estoque/produto/${id}` : "/estoque",
          permissions: ["estoque.visualizar", "produtos.visualizar"],
        },
        {
          id: "pr-compras",
          label: "Abrir compras",
          group: "Produto",
          route: "/estoque/compras",
          permissions: ["compras.visualizar"],
        },
        {
          id: "pr-fornecedor",
          label: "Ver fornecedores",
          group: "Produto",
          route: "/estoque/fornecedores",
          permissions: ["fornecedores.visualizar", "compras.visualizar"],
        },
      ].filter((c) => hasAny(permissions, c.permissions));
    case "vehicle":
      return [
        {
          id: "ve-os",
          label: "Ver OS",
          group: "Veículo",
          route: "/operacao/ordens",
          permissions: ["os.visualizar"],
        },
        {
          id: "ve-customer",
          label: "Ver cliente",
          group: "Veículo",
          route: ids.relatedId
            ? `/operacao/clientes/${ids.relatedId}`
            : "/operacao/clientes",
          permissions: ["clientes.visualizar"],
        },
      ].filter((c) => hasAny(permissions, c.permissions));
    default:
      return [];
  }
}
