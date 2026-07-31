export {
  dsControl,
  dsElevation,
  dsGap,
  dsGrid,
  dsIconBox,
  dsIconSize,
  dsInteractive,
  dsLayout,
  dsMotion,
  dsPadding,
  dsRadius,
  dsShadow,
  dsSpace,
  dsStatus,
  dsTrendTone,
  dsType,
  dsValueTone,
  type DsStatusTone,
} from "@/lib/design-system/tokens";

export type { DsIconSize } from "@/lib/design-system/icons";

/** Executive Design System (Sprint 10.1) — camada premium, não substitui `ds*` */
export { exColors, type ExColorTone } from "@/lib/design-system/colors";
export {
  exSpacing,
  exPadding,
  exPaddingX,
  exPaddingY,
  exStack,
  exSize,
  type ExSpacingScale,
  type ExSizeScale,
} from "@/lib/design-system/spacing";
export { exRadius, type ExRadiusScale } from "@/lib/design-system/radius";
export { exShadow, type ExShadowScale } from "@/lib/design-system/shadow";
export {
  exTypography,
  type ExTypographyScale,
} from "@/lib/design-system/typography";
export {
  exAnimations,
  exAnimationDelay,
  exGlass,
  exStagger,
  type ExAnimation,
} from "@/lib/design-system/animations";
export { exMotion, type ExMotionKey } from "@/lib/design-system/motion";

/** Brand Foundation (Sprint 19 · Gate 19.0) — tokens canônicos oficiais */
export {
  gofColors,
  gofSpacing,
  gofSpaceY,
  gofPadding,
  gofMargin,
  gofRadius,
  gofShadow,
  gofTypography,
  gofMotion,
  type GofColorToken,
  type GofSpacingScale,
  type GofRadiusScale,
  type GofShadowScale,
  type GofTypographyScale,
  type GofMotionKey,
} from "@/lib/design-system/foundation";
export {
  GOF_THEME_DEFAULT,
  GOF_DARK_MODE_ENABLED,
  GOF_THEME_HTML_ATTR,
  gofThemeLight,
  gofThemeDark,
  getGofTheme,
  type GofThemeMode,
  type GofThemeTokens,
} from "@/lib/design-system/theme";
export {
  gofContainer,
  gofPagePadding,
  gofGrid,
  gofSurface,
  gofStack,
  gofInline,
} from "@/lib/design-system/layout";
export {
  gofCardSurface,
  gofCardPadding,
  gofCardHeader,
  gofCardFooter,
  gofFocusRing,
  gofControl,
  gofControlTextarea,
  gofInteractive,
  gofCardPaddingFromEx,
} from "@/lib/design-system/primitives";

/** Sprint 25.7 — motion + surfaces premium */
export {
  premiumMotion,
  premiumSurfaces,
  premiumType,
  gfMotion,
  gfSpace,
  gfSurface,
  gfType,
  SIGNATURE_SPRINT,
} from "@/lib/design-system/premium-motion";

export {
  gfMotion as signatureMotion,
  gfSpace as signatureSpace,
  gfSurface as signatureSurface,
  gfType as signatureType,
} from "@/lib/design-system/signature";

