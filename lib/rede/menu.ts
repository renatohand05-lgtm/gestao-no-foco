import type { ModuloRede } from "./tipos.ts";

export type ItemMenuRede = {
  href: string;
  label: string;
  modulo: ModuloRede;
  /** Outros módulos que também dão acesso à aba (ex.: Cozinha central = rupturas ou estoque da central). */
  ou?: readonly ModuloRede[];
};

/** Abas do módulo. As rodadas seguintes acrescentam as demais (RH, avaliação de gerentes…). */
export const MENU_REDE: readonly ItemMenuRede[] = [
  { href: "", label: "Visão geral", modulo: "dashboard" },
  { href: "/vendas", label: "Vendas", modulo: "vendas" },
  { href: "/metas", label: "Metas e indicadores", modulo: "metas" },
  { href: "/cmv", label: "CMV", modulo: "cmv" },
  { href: "/dre", label: "DRE", modulo: "dre" },
  { href: "/cozinha", label: "Cozinha central", modulo: "rupturas", ou: ["estoque_cc"] },
  { href: "/qualidade", label: "Checklist de qualidade", modulo: "qualidade" },
  { href: "/delivery", label: "Checklist de delivery", modulo: "delivery" },
  { href: "/planos", label: "Planos de ação", modulo: "planos_acao" },
  { href: "/rh", label: "RH", modulo: "rh_quadro", ou: ["rh_movimentos", "rh_ocorrencias"] },
  { href: "/orcamento", label: "Orçamento e expansão", modulo: "orcamento" },
  { href: "/lojas", label: "Lojas e acessos", modulo: "config" },
];

/** Todos os módulos que abrem a aba. */
export const modulosDoItem = (m: Pick<ItemMenuRede, "modulo" | "ou">): ModuloRede[] => [m.modulo, ...(m.ou ?? [])];
