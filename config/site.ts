import { brandConfig } from "@/config/brand";

/**
 * Site config — alinhado à identidade oficial (Gate 19.0.1).
 * `name` = marca curta "Gestão".
 */
export const siteConfig = {
  name: brandConfig.name,
  subtitle: brandConfig.subtitle,
  slogan: brandConfig.slogan,
  edition: brandConfig.edition,
  description:
    "Controle total da sua empresa em uma única plataforma. Financeiro, vendas, estoque, CRM, compras, BI e inteligência empresarial conectados.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  links: {
    github: "https://github.com/gestao-no-foco",
    support: "mailto:suporte@gestaonoFoco.com.br",
  },
} as const;
