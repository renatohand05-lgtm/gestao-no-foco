/**
 * Executive Design System — tipografia (Sprint 13.4 freeze)
 * Metric XL · Metric LG · Title · Subtitle · Caption · Label
 * Sem tamanhos arbitrários na UI — apenas estes tokens.
 */

export const exTypography = {
  display:
    "text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl",
  hero: "text-[2rem] font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem]",
  headline:
    "text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] lg:text-3xl",
  heading:
    "text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-[1.75rem]",
  title:
    "text-lg font-semibold tracking-tight text-foreground sm:text-xl",
  sectionTitle:
    "text-[0.9375rem] font-semibold tracking-tight text-foreground sm:text-base",
  cardTitle: "text-sm font-medium tracking-tight text-foreground",
  subtitle: "text-sm leading-snug text-muted-foreground sm:text-[0.9375rem]",
  body: "text-sm leading-relaxed text-foreground/90 sm:text-[0.9375rem]",
  caption: "text-xs leading-snug text-muted-foreground",
  /** Micro — eixos de gráfico / legendas densas / kbd */
  micro:
    "text-[0.625rem] leading-tight text-muted-foreground sm:text-[0.65rem]",
  label:
    "text-[0.65rem] font-medium tracking-[0.04em] text-slate-400 dark:text-muted-foreground",
  /** Metric cockpit — protagonista do Hero (Sprint 13.10) */
  scoreHero:
    "text-[3.25rem] font-semibold tracking-tight tabular-nums text-foreground sm:text-6xl lg:text-[4.25rem]",
  /** Metric XL — Score / Receita / Hero */
  metricXl:
    "text-[2.5rem] font-semibold tracking-tight tabular-nums text-foreground sm:text-5xl lg:text-[3.25rem]",
  /** Métricas de apoio no cockpit (subordinadas ao Score) */
  metricSupport:
    "text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-[1.5rem] lg:text-[1.65rem]",
  /** Metric LG — KPIs primários / Meta Gap Forecast */
  metricLg:
    "text-[1.75rem] font-semibold tracking-tight tabular-nums text-foreground sm:text-[2rem] lg:text-[2.25rem]",
  metric:
    "text-3xl font-semibold tracking-tight tabular-nums text-foreground sm:text-4xl",
  metricSm:
    "text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-[1.65rem]",
  kpiPrimary:
    "text-[1.75rem] font-semibold tracking-tight tabular-nums text-foreground sm:text-[2rem] lg:text-[2.25rem]",
  kpiSecondary:
    "text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-[1.35rem]",
} as const;

export type ExTypographyScale = keyof typeof exTypography;
