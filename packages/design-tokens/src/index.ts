/**
 * Tokens multiplataforma — hex only (sem classes Tailwind).
 * Fonte visual alinhada a config/brand + lib/design-system/foundation.
 */

export const gofPalette = {
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
  border: "#E4E4E7",
  muted: "#F4F4F5",
} as const;

export const gofSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const gofRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const gofTypography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: "700" as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "600" as const },
  subtitle: { fontSize: 16, lineHeight: 22, fontWeight: "500" as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" as const },
};

export const gofMotion = {
  fastMs: 150,
  normalMs: 250,
  slowMs: 400,
};

export const lightTheme = {
  background: gofPalette.white,
  surface: gofPalette.white,
  text: gofPalette.navy,
  textMuted: gofPalette.silverMuted,
  primary: gofPalette.gold,
  border: gofPalette.border,
  danger: gofPalette.danger,
  success: gofPalette.success,
} as const;

export const darkTheme = {
  background: gofPalette.navy,
  surface: gofPalette.graphite,
  text: gofPalette.white,
  textMuted: gofPalette.silverMuted,
  primary: gofPalette.gold,
  border: gofPalette.graphiteElevated,
  danger: gofPalette.danger,
  success: gofPalette.success,
} as const;

/**
 * Tab bar — contraste enterprise (Sprint 32.4).
 * Inactive ≠ disabled: inativo permanece legível; disabled é mais apagado.
 */
export const gofTabBar = {
  light: {
    bg: gofPalette.white,
    border: gofPalette.border,
    active: gofPalette.goldDeep,
    /** Cinza médio — legível; ≠ disabled. */
    inactive: "#3D4654",
    disabled: "#A1A1AA",
    labelActive: gofPalette.goldDeep,
    labelInactive: "#3D4654",
  },
  dark: {
    bg: gofPalette.graphite,
    border: gofPalette.graphiteElevated,
    active: gofPalette.goldSoft,
    /** Prata clara — não usar silverMuted (parece disabled). */
    inactive: "#D8DDE6",
    disabled: "#5C6370",
    labelActive: gofPalette.goldSoft,
    labelInactive: "#D8DDE6",
  },
} as const;

export type GofTheme = typeof lightTheme | typeof darkTheme;
