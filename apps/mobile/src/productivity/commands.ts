import type { AdaptiveProfile, CommandItem } from "@/productivity/types";

import { hasAnyPermission } from "@gof/rbac-contracts";

function hasAny(permissions: readonly string[], keys: string[]): boolean {
  return hasAnyPermission(permissions, keys);
}

export function resolveAdaptiveProfile(
  permissions: readonly string[],
): AdaptiveProfile {
  if (hasAny(permissions, ["dashboard.executivo", "analytics.executivo"])) {
    return "GESTOR";
  }
  if (
    hasAny(permissions, ["financeiro.visualizar", "ver_dre", "ver_fluxo_caixa"]) &&
    !hasAny(permissions, ["os.visualizar", "estoque.visualizar"])
  ) {
    return "FINANCEIRO";
  }
  if (
    hasAny(permissions, ["estoque.visualizar", "produtos.visualizar", "compras.visualizar"]) &&
    !hasAny(permissions, ["os.visualizar"])
  ) {
    return "ESTOQUE";
  }
  if (
    hasAny(permissions, ["os.visualizar", "centro_operacoes.visualizar"]) &&
    !hasAny(permissions, ["crm.pipeline.visualizar", "dashboard.executivo"])
  ) {
    return "MECANICO";
  }
  if (hasAny(permissions, ["crm.visualizar", "clientes.visualizar", "crm.pipeline.visualizar"])) {
    return "CONSULTOR";
  }
  return "GERAL";
}

const ALL_COMMANDS: CommandItem[] = [
  { id: "home", label: "Abrir Dashboard", group: "Navegação", route: "/", permissions: ["dashboard.executivo", "dashboard.visualizar", "analytics.executivo"] },
  { id: "intel", label: "Abrir Inteligência", group: "Navegação", route: "/inteligencia", permissions: ["dashboard.executivo", "analytics.executivo"] },
  { id: "finance", label: "Abrir Financeiro", group: "Navegação", route: "/financeiro", permissions: ["financeiro.visualizar"] },
  { id: "crm", label: "Abrir CRM", group: "Navegação", route: "/crm", permissions: ["crm.visualizar", "clientes.visualizar"] },
  { id: "stock", label: "Abrir Estoque", group: "Navegação", route: "/estoque", permissions: ["estoque.visualizar", "produtos.visualizar"] },
  { id: "ops", label: "Abrir Operação", group: "Navegação", route: "/operacao", permissions: ["os.visualizar", "centro_operacoes.visualizar"] },
  { id: "search", label: "Busca global", group: "Produtividade", action: "open-search", permissions: [] },
  { id: "search-cliente", label: "Buscar cliente", group: "Produtividade", action: "open-search", permissions: ["clientes.visualizar", "crm.visualizar", "os.visualizar"] },
  { id: "search-veiculo", label: "Buscar veículo", group: "Produtividade", action: "open-search", permissions: ["os.visualizar"] },
  { id: "search-os", label: "Buscar OS", group: "Produtividade", action: "open-search", permissions: ["os.visualizar"] },
  { id: "scanner", label: "Abrir Scanner", group: "Produtividade", action: "open-scanner", permissions: ["produtos.visualizar", "estoque.visualizar", "os.visualizar"] },
  { id: "new-os-web", label: "Nova OS via portal", group: "Operação", route: "/ordens/nova", opensWeb: true, permissions: ["os.criar"] },
  { id: "new-cliente-web", label: "Novo cliente via portal", group: "Operação", route: "/clientes/novo", opensWeb: true, permissions: ["clientes.criar"] },
  { id: "agenda", label: "Abrir agenda", group: "Operação", route: "/operacao/agenda", permissions: ["agenda.visualizar"] },
  { id: "alerts", label: "Abrir alertas", group: "Operação", route: "/operacao/notificacoes", permissions: ["centro_operacoes.ver_alertas", "centro_operacoes.visualizar"] },
  { id: "profile", label: "Abrir perfil", group: "Conta", route: "/profile", permissions: [] },
  { id: "settings", label: "Abrir ajustes", group: "Conta", route: "/settings", permissions: [] },
  { id: "tenant", label: "Trocar empresa", group: "Conta", action: "switch-tenant", permissions: [] },
  { id: "branch", label: "Trocar filial", group: "Conta", action: "switch-branch", permissions: [] },
  { id: "theme", label: "Alternar tema", group: "Conta", action: "toggle-theme", permissions: [] },
  { id: "logout", label: "Sair", group: "Conta", action: "logout", permissions: [] },
];

export function listCommandsForPermissions(
  permissions: readonly string[],
  filter?: string,
): CommandItem[] {
  const q = filter?.trim().toLowerCase() ?? "";
  return ALL_COMMANDS.filter((cmd) => {
    if (cmd.permissions.length > 0 && !hasAny(permissions, cmd.permissions)) {
      return false;
    }
    if (!q) return true;
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.group.toLowerCase().includes(q) ||
      cmd.id.includes(q)
    );
  });
}

export function shortcutsForProfile(profile: AdaptiveProfile): CommandItem[] {
  const byId = (ids: string[]) =>
    ALL_COMMANDS.filter((c) => ids.includes(c.id));
  switch (profile) {
    case "GESTOR":
      return byId(["home", "intel", "finance", "alerts", "search"]);
    case "MECANICO":
      return byId(["ops", "agenda", "scanner", "alerts", "search"]);
    case "CONSULTOR":
      return byId(["crm", "ops", "agenda", "scanner", "search"]);
    case "FINANCEIRO":
      return byId(["finance", "alerts", "home", "search"]);
    case "ESTOQUE":
      return byId(["stock", "scanner", "search", "ops"]);
    default:
      return byId(["search", "home", "ops", "crm", "stock"]);
  }
}
