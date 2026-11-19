import type { ModuloRede } from "./tipos.ts";

/** Abas do módulo. As rodadas seguintes acrescentam as demais (CMV, DRE, RH…). */
export const MENU_REDE: readonly { href: string; label: string; modulo: ModuloRede }[] = [
  { href: "", label: "Visão geral", modulo: "dashboard" },
  { href: "/vendas", label: "Vendas", modulo: "vendas" },
  { href: "/metas", label: "Metas e indicadores", modulo: "metas" },
  { href: "/cmv", label: "CMV", modulo: "cmv" },
  { href: "/dre", label: "DRE", modulo: "dre" },
  { href: "/orcamento", label: "Orçamento e expansão", modulo: "orcamento" },
  { href: "/lojas", label: "Lojas e acessos", modulo: "config" },
];
