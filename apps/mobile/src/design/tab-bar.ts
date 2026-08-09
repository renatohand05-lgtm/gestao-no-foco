/**
 * Sprint 32.4 — tokens e opções da tab bar mobile.
 * Inactive ≠ disabled; contraste legível em dark/light.
 */
import { gofTabBar, gofTypography } from "@gof/design-tokens";
import { Platform, type TextStyle, type ViewStyle } from "react-native";

export type TabBarTone = keyof typeof gofTabBar;

export const TAB_ICON_SIZE = 24;
/** Alvo mínimo de toque iOS HIG. */
export const TAB_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

export function resolveTabBarTokens(resolved: "light" | "dark") {
  const t = gofTabBar[resolved];
  return {
    TAB_BAR_BG: t.bg,
    TAB_BAR_BORDER: t.border,
    TAB_ACTIVE: t.active,
    TAB_INACTIVE: t.inactive,
    TAB_DISABLED: t.disabled,
    TAB_LABEL_ACTIVE: t.labelActive,
    TAB_LABEL_INACTIVE: t.labelInactive,
  } as const;
}

export type TabScreenOptions = {
  headerShown: boolean;
  tabBarActiveTintColor: string;
  tabBarInactiveTintColor: string;
  tabBarActiveBackgroundColor: string;
  tabBarInactiveBackgroundColor: string;
  tabBarHideOnKeyboard: boolean;
  tabBarLabelStyle: TextStyle;
  tabBarIconStyle: ViewStyle;
  tabBarItemStyle: ViewStyle;
  tabBarStyle: ViewStyle;
  tabBarAllowFontScaling: boolean;
};

export function buildTabScreenOptions(
  resolved: "light" | "dark",
): TabScreenOptions {
  const tokens = resolveTabBarTokens(resolved);
  return {
    headerShown: true,
    tabBarActiveTintColor: tokens.TAB_ACTIVE,
    tabBarInactiveTintColor: tokens.TAB_INACTIVE,
    tabBarActiveBackgroundColor: "transparent",
    tabBarInactiveBackgroundColor: "transparent",
    tabBarHideOnKeyboard: true,
    tabBarLabelStyle: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "600",
      marginBottom: Platform.OS === "ios" ? 2 : 4,
    },
    tabBarIconStyle: {
      marginTop: 2,
    },
    tabBarItemStyle: {
      minHeight: 44,
      paddingVertical: 2,
    },
    tabBarStyle: {
      backgroundColor: tokens.TAB_BAR_BG,
      borderTopColor: tokens.TAB_BAR_BORDER,
      borderTopWidth: 1,
      // Safe area inferior é aplicada pelo React Navigation.
      paddingTop: 4,
      height: Platform.OS === "ios" ? 88 : 64,
      elevation: 0,
      shadowOpacity: 0,
    },
    tabBarAllowFontScaling: true,
  };
}

/** Tipografia de apoio (labels fora da tab). */
export const tabLabelTypography = {
  ...gofTypography.caption,
  fontWeight: "600" as const,
};
