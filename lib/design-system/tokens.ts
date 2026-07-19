/**
 * Design System — tokens visuais reutilizáveis (Fase 1).
 * Somente classes Tailwind / strings serializáveis. Sem lógica de negócio.
 */

/** Escala de border-radius */
export const dsRadius = {
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
  full: "rounded-full",
  badge: "rounded-full",
  control: "rounded-md",
} as const;

/** Elevação / sombra */
export const dsShadow = {
  none: "shadow-none",
  sm: "shadow-sm",
  md: "shadow-md",
  hover: "hover:shadow-md",
} as const;

/** Superfícies de card padronizadas */
export const dsElevation = {
  card: "border border-border/60 bg-card/80 shadow-sm",
  cardMuted: "border border-border/60 bg-muted/20",
  cardInteractive:
    "border border-border/60 bg-gradient-to-br from-card via-card to-muted/30 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md hover:shadow-primary/5",
  cardPremium:
    "border border-border/60 bg-gradient-to-br from-card via-card to-muted/25 shadow-sm ring-1 ring-black/[0.02] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/10 hover:ring-primary/10",
  section: "border border-border/60 bg-card/80 shadow-sm",
  empty:
    "rounded-xl border border-dashed border-border/60 bg-card/50",
  skeleton: "animate-pulse rounded-xl border border-border/60 bg-muted/30",
} as const;

/** Motion discreto */
export const dsMotion = {
  fadeIn: "animate-in fade-in-0 duration-500",
  fadeUp: "animate-in fade-in-0 slide-in-from-bottom-2 duration-500",
  scaleIn: "animate-in zoom-in-95 duration-300",
  progress: "transition-[width,stroke-dashoffset] duration-700 ease-out",
  hover: "transition-all duration-300 ease-out",
} as const;

/** Espaçamento vertical de página / seções */
export const dsSpace = {
  page: "space-y-6",
  /** 24px entre blocos do dashboard executivo */
  dashboard: "space-y-6",
  section: "space-y-4",
  stackXs: "space-y-1",
  stackSm: "space-y-1.5",
  stackMd: "space-y-2",
  stackLg: "space-y-3",
} as const;

/** Gaps horizontais / de grid — gap-6 = 24px */
export const dsGap = {
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
  xl: "gap-6",
} as const;

/** Padding de layout */
export const dsPadding = {
  page: "p-4 md:p-6 lg:p-8",
  card: "p-5",
  cardSm: "p-4",
  cardXs: "p-3",
  empty: "px-6 py-16",
  sectionX: "px-6 md:px-10",
  sectionY: "py-8",
} as const;

/** Max-width e containers */
export const dsLayout = {
  maxWidth: "max-w-7xl",
  content: "mx-auto w-full max-w-7xl",
  narrow: "max-w-3xl",
  prose: "max-w-sm",
} as const;

/** Grids responsivos padronizados (24px = gap-6) */
export const dsGrid = {
  kpis: "grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
  twoCol: "grid gap-6 lg:grid-cols-2",
  threeCol: "grid gap-6 lg:grid-cols-3",
  metrics: "grid gap-6 sm:grid-cols-2 lg:grid-cols-4",
  intelligence: "grid gap-6 xl:grid-cols-[1.2fr_0.8fr]",
  filters: "grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5",
} as const;

/** Tipografia */
export const dsType = {
  pageTitle: "text-2xl font-semibold tracking-tight sm:text-3xl",
  sectionTitle: "text-lg font-semibold tracking-tight",
  cardTitle: "text-base font-semibold",
  eyebrow:
    "text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground",
  description: "text-sm text-muted-foreground",
  descriptionLg: "text-sm text-muted-foreground sm:text-base",
  kpiLabel: "text-sm font-medium text-muted-foreground",
  kpiValue: "text-2xl font-semibold tracking-tight tabular-nums",
  kpiValueLg: "text-3xl font-semibold tracking-tight tabular-nums",
  metricValue: "text-2xl font-semibold tracking-tight sm:text-3xl tabular-nums",
  legend: "text-xs text-muted-foreground",
  caption: "text-[11px] text-muted-foreground",
  tooltip: "text-xs",
  badge: "text-xs font-medium",
} as const;

/** Tamanhos de ícone */
export const dsIconSize = {
  xs: "size-3",
  sm: "size-3.5",
  md: "size-4",
  lg: "size-6",
  xl: "size-8",
} as const;

/** Container padrão para ícones em cards */
export const dsIconBox = {
  sm: "flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
  md: "flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background/80 text-muted-foreground shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary",
  lg: "mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary",
  timeline:
    "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/30 shadow-sm",
  medal:
    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums shadow-sm",
} as const;

/** Estados de interação */
export const dsInteractive = {
  focus:
    "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
  focusCard:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
  disabled: "disabled:pointer-events-none disabled:opacity-50",
  hoverLift: "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
} as const;

/** Cores semânticas de status (success / warning / danger / neutral) */
export const dsStatus = {
  success: {
    text: "text-emerald-700 dark:text-emerald-400",
    soft: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/30",
    solid: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    text: "text-amber-700 dark:text-amber-400",
    soft: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    border: "border-amber-500/30",
    solid: "text-amber-600 dark:text-amber-400",
  },
  danger: {
    text: "text-rose-700 dark:text-rose-400",
    soft: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    border: "border-rose-500/30",
    solid: "text-rose-600 dark:text-rose-400",
  },
  neutral: {
    text: "text-muted-foreground",
    soft: "bg-muted text-muted-foreground",
    border: "border-border/60",
    solid: "text-muted-foreground",
  },
  info: {
    text: "text-sky-700 dark:text-sky-400",
    soft: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    border: "border-sky-500/30",
    solid: "text-sky-600 dark:text-sky-400",
  },
} as const;

export type DsStatusTone = keyof typeof dsStatus;

/** Tom positivo/negativo para valores monetários (não inverte tendência) */
export function dsValueTone(value: number): string | undefined {
  if (value > 0) return dsStatus.success.text;
  if (value < 0) return dsStatus.danger.text;
  return undefined;
}

/** Tom de tendência (up = success, down = danger) */
export function dsTrendTone(
  trend: "up" | "down" | "neutral",
): string {
  if (trend === "up") return dsStatus.success.soft;
  if (trend === "down") return dsStatus.danger.soft;
  return dsStatus.neutral.soft;
}

/** Controle de formulário padrão (inputs / selects) */
export const dsControl =
  "flex h-9 w-full min-w-36 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60";
