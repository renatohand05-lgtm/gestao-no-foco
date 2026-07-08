export const siteConfig = {
  name: "Gestão no Foco",
  description:
    "Plataforma de gestão empresarial inteligente, multiempresa e multiusuário para pequenos e médios negócios.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  links: {
    github: "https://github.com/gestao-no-foco",
    support: "mailto:suporte@gestaonoFoco.com.br",
  },
} as const;
