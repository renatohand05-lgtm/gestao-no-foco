/**
 * Identidade oficial — Gestão (Sprint 19 · Gate 19.0.1)
 * Somente branding. Sem regras de negócio.
 */

export const brandConfig = {
  /** Nome curto oficial */
  name: "Gestão",
  /** Nome legado / repositório (compat) */
  legalName: "Gestão no Foco",
  subtitle: "Plataforma de Gestão Inteligente",
  slogan: "Controle • Estratégia • Resultados",
  edition: "Enterprise",
  themeColor: "#1A1C1E",
  backgroundColor: "#FFFFFF",
  accentColor: "#C9A84C",
} as const;

/** Paleta oficial — nada fora desta lista */
export const brandPalette = {
  graphite: "#1A1C1E",
  gold: "#C9A84C",
  white: "#FFFFFF",
  grayLight: "#F4F4F5",
  grayDark: "#3F3F46",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#5B6B7A",
} as const;

export const brandFonts = {
  display: "Space Grotesk",
  sans: "Inter",
  mono: "JetBrains Mono",
} as const;

export const brandAssets = {
  logo: "/brand/logo.svg",
  mark: "/brand/mark.svg",
  faviconIco: "/favicon.ico",
  faviconSvg: "/favicon.svg",
  appleTouchIcon: "/apple-touch-icon.png",
  manifest: "/manifest.webmanifest",
} as const;
