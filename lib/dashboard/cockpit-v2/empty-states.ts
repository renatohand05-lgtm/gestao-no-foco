/**
 * Sprint 30.4 — Empty states executivos (copy only).
 */

import { getSegmentCockpitCopy } from "@/config/dashboard/cockpit-v2";

export type EmptyDomain =
  | "vendas"
  | "clientes"
  | "produtos"
  | "servicos"
  | "compras"
  | "metas"
  | "dre";

export type EmptyStateCopy = {
  domain: EmptyDomain;
  title: string;
  body: string;
  ctaLabel: string;
  hrefSuffix: string;
};

export function getCockpitEmptyStates(
  segment: string | null | undefined,
): EmptyStateCopy[] {
  const copy = getSegmentCockpitCopy(segment);
  return [
    {
      domain: "vendas",
      title: copy.emptySalesTitle,
      body: copy.emptySalesBody,
      ctaLabel: "Cadastrar primeira venda",
      hrefSuffix: "/vendas/nova",
    },
    {
      domain: "clientes",
      title: "Você ainda não possui clientes",
      body: "Cadastre seu primeiro cliente para ativar o comercial.",
      ctaLabel: "Novo cliente",
      hrefSuffix: "/clientes/novo",
    },
    {
      domain: "produtos",
      title: "Você ainda não possui produtos",
      body: "Inclua o primeiro produto no catálogo.",
      ctaLabel: "Novo produto",
      hrefSuffix: "/produtos/novo",
    },
    {
      domain: "servicos",
      title: "Você ainda não possui serviços",
      body: "Cadastre serviços para operar com agenda e ordens.",
      ctaLabel: "Cadastrar serviços",
      hrefSuffix: "/produtos/servicos",
    },
    {
      domain: "compras",
      title: "Você ainda não possui compras",
      body: "Registre o primeiro pedido de compra quando precisar repor.",
      ctaLabel: "Abrir compras",
      hrefSuffix: "/compras",
    },
    {
      domain: "metas",
      title: "Meta do mês não cadastrada",
      body: "Defina a meta para acompanhar realizado e projeção no cockpit.",
      ctaLabel: "Cadastrar meta",
      hrefSuffix: "/configuracoes/metas/nova",
    },
    {
      domain: "dre",
      title: "DRE ainda sem movimentos suficientes",
      body: "Com vendas e lançamentos, o DRE executivo ganha leitura completa.",
      ctaLabel: "Abrir DRE",
      hrefSuffix: "/financeiro/dre",
    },
  ];
}
