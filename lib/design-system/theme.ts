/**
 * Theme oficial — Gestão (Sprint 19 · Gate 19.0 / 19.0.1).
 *
 * Modo claro: ativo (padrão da plataforma).
 * Dark Mode: arquitetura preparada — NÃO ativar ainda.
 *
 * Tokens mapeiam para CSS variables em `app/globals.css` (paleta Brand Guide).
 * Não altera regras de negócio.
 */

import { gofColors } from "./foundation";

export type GofThemeMode = "light" | "dark";

/** Modo oficial atual. Dark permanece reservado. */
export const GOF_THEME_DEFAULT: GofThemeMode = "light";

/** Flag de produto — Dark Mode ainda não é feature. */
export const GOF_DARK_MODE_ENABLED = false as const;

/**
 * Contrato de theme — valores semânticos.
 * Classes Tailwind usam variáveis CSS (`bg-background`, etc.).
 */
export type GofThemeTokens = {
  mode: GofThemeMode;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    background: string;
    surface: string;
    border: string;
    muted: string;
    foreground: string;
  };
  /** Classes utilitárias prontas para composição */
  surfaces: {
    page: string;
    card: string;
    muted: string;
    border: string;
  };
};

/** Theme claro oficial */
export const gofThemeLight: GofThemeTokens = {
  mode: "light",
  colors: {
    primary: gofColors.primary.hex,
    secondary: gofColors.secondary.hex,
    success: gofColors.success.hex,
    warning: gofColors.warning.hex,
    danger: gofColors.danger.hex,
    info: gofColors.info.hex,
    background: gofColors.background.hex,
    surface: gofColors.surface.hex,
    border: gofColors.border.hex,
    muted: gofColors.muted.hex,
    foreground: "#1A1C1E",
  },
  surfaces: {
    page: "bg-background text-foreground",
    card: "bg-card text-card-foreground border border-border",
    muted: "bg-muted text-muted-foreground",
    border: "border-border",
  },
};

/**
 * Theme escuro — preparado para Gate futuro.
 * Não aplicar em runtime enquanto `GOF_DARK_MODE_ENABLED === false`.
 */
export const gofThemeDark: GofThemeTokens = {
  mode: "dark",
  colors: {
    primary: "#C9A84C",
    secondary: "#3F3F46",
    success: "#4ade80",
    warning: "#fbbf24",
    danger: "#f87171",
    info: "#5B6B7A",
    background: "#1A1C1E",
    surface: "#242628",
    border: "rgba(255,255,255,0.10)",
    muted: "#3F3F46",
    foreground: "#FFFFFF",
  },
  surfaces: {
    page: "dark:bg-background dark:text-foreground",
    card: "dark:bg-card dark:text-card-foreground dark:border-white/10",
    muted: "dark:bg-muted dark:text-muted-foreground",
    border: "dark:border-white/10",
  },
};

/** Theme ativo da plataforma (sempre light até Dark Mode ser liberado). */
export function getGofTheme(mode: GofThemeMode = GOF_THEME_DEFAULT): GofThemeTokens {
  if (mode === "dark" && GOF_DARK_MODE_ENABLED) {
    return gofThemeDark;
  }
  return gofThemeLight;
}

/**
 * Atributo HTML reservado para Dark Mode futuro.
 * Ex.: `<html data-gof-theme="light">` — não trocar para "dark" ainda.
 */
export const GOF_THEME_HTML_ATTR = "data-gof-theme" as const;
