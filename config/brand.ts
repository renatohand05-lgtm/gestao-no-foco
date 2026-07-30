/**
 * Identidade oficial — Gestão (Sprint 25.5 · Premium)
 * Somente branding. Sem regras de negócio.
 */

export const brandConfig = {
  /** Nome curto oficial */
  name: "Gestão",
  /** Nome legado / repositório (compat) */
  legalName: "Gestão no Foco",
  subtitle: "Plataforma de Gestão Inteligente",
  slogan: "Controle • Estratégia • Resultados",
  positioning: "A plataforma que eleva sua gestão ao próximo nível.",
  edition: "Enterprise",
  pillars: [
    "Tecnologia",
    "Estratégia",
    "Dados",
    "Resultados",
    "Segurança",
  ] as const,
  themeColor: "#0B0F14",
  backgroundColor: "#0B0F14",
  accentColor: "#C9A84C",
} as const;

/** Paleta oficial premium — preto / navy / grafite / dourado / prata */
export const brandPalette = {
  black: "#05070A",
  navy: "#0B0F14",
  graphite: "#1A1C1E",
  graphiteElevated: "#242628",
  gold: "#C9A84C",
  goldSoft: "#F0D78C",
  goldDeep: "#8A7028",
  silver: "#C8CDD5",
  silverMuted: "#8B93A0",
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
  logoLight: "/brand/logo-light.svg",
  mark: "/brand/mark.svg",
  markLight: "/brand/mark-light.svg",
  markPng: "/brand/icon-64.png",
  markTransparent: "/brand/mark-64.png",
  icon512: "/brand/icon-512.png",
  icon192: "/brand/icon-192.png",
  icon96: "/brand/icon-96.png",
  icon64: "/brand/icon-64.png",
  icon32: "/brand/icon-32.png",
  icon16: "/brand/icon-16.png",
  faviconIco: "/favicon.ico",
  faviconSvg: "/favicon.svg",
  favicon32: "/favicon-32.png",
  favicon16: "/favicon-16.png",
  appleTouchIcon: "/apple-touch-icon.png",
  manifest: "/manifest.webmanifest",
} as const;

export const brandStorageKeys = {
  theme: "gof-theme-preference",
  splashSeen: "gof-splash-seen",
} as const;
