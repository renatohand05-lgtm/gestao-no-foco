/**
 * Executive Design System — sombras (Sprint 13.0)
 * Elevação Stripe/Linear — sem glow excessivo.
 */

export const exShadow = {
  xs: "shadow-xs",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
  none: "shadow-none",
  card:
    "shadow-[0_1px_2px_rgba(15,23,42,0.025),0_6px_16px_rgba(15,23,42,0.035)] dark:shadow-black/40",
  cardHover:
    "hover:shadow-[0_2px_6px_rgba(15,23,42,0.04),0_10px_24px_rgba(15,23,42,0.05)]",
  elevated:
    "shadow-[0_3px_10px_rgba(15,23,42,0.04),0_14px_32px_rgba(15,23,42,0.055)]",
  hero:
    "shadow-[0_10px_36px_rgba(15,23,42,0.16),0_28px_64px_rgba(15,23,42,0.10)]",
  glow: "shadow-[0_0_0_1px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)]",
  decision:
    "shadow-[0_4px_16px_rgba(15,23,42,0.06),0_18px_44px_rgba(15,23,42,0.07)]",
  action:
    "shadow-[0_6px_20px_rgba(15,23,42,0.08),0_22px_52px_rgba(15,23,42,0.10)]",
  /** Hierarquia de card — Action / Risk / Opportunity (Sprint 13.8) */
  priorityAction:
    "shadow-[0_4px_16px_rgba(15,23,42,0.07),0_20px_48px_rgba(15,23,42,0.09)]",
  priorityRisk:
    "shadow-[0_2px_8px_rgba(15,23,42,0.04),0_14px_36px_rgba(220,38,38,0.08)]",
  priorityOpportunity:
    "shadow-[0_1px_3px_rgba(15,23,42,0.03),0_10px_28px_rgba(5,150,105,0.06)]",
  /** Action Center — tom crítico / alta */
  critical:
    "shadow-[0_4px_16px_rgba(220,38,38,0.10),0_20px_48px_rgba(15,23,42,0.06)]",
  warningElevated:
    "shadow-[0_4px_16px_rgba(234,88,12,0.08),0_18px_44px_rgba(15,23,42,0.06)]",
  /** Toolbar / chrome leve */
  toolbar: "shadow-[0_1px_2px_rgba(15,23,42,0.03)]",
  /** Ghost DnD */
  ghost:
    "shadow-[0_16px_40px_rgba(15,23,42,0.18)]",
  /** Linha de inserção DnD */
  insertLine: "shadow-[0_0_0_3px_rgba(37,99,235,0.18)]",
  /** Painel interno do Hero (superfície escura) */
  heroPanel: "shadow-[0_8px_24px_rgba(0,0,0,0.18)]",
  /** Barra de evolução (destaque positivo) */
  successGlow: "shadow-[0_0_8px_rgba(22,163,74,0.35)]",
} as const;

export type ExShadowScale = keyof typeof exShadow;
