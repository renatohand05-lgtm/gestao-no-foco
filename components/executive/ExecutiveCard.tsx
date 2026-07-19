import { cn } from "@/lib/utils";
import { exAnimations } from "@/lib/design-system/animations";
import { exPadding } from "@/lib/design-system/spacing";
import { exRadius } from "@/lib/design-system/radius";
import { exShadow } from "@/lib/design-system/shadow";

export type ExecutiveCardPriority =
  | "action"
  | "risk"
  | "opportunity"
  | "info"
  | "none";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Hover lift/scale — foco fica nos controls internos (Sprint 13.8 a11y). */
  interactive?: boolean;
  padding?: keyof typeof exPadding;
  accent?: "primary" | "success" | "warning" | "danger" | "info" | "none";
  /** Nível de hierarquia visual (Sprint 13.4) */
  priority?: ExecutiveCardPriority;
};

const accentBorder = {
  none: "",
  primary: "border-l-[3px] border-l-blue-600/90",
  success: "border-l-[3px] border-l-emerald-600/90",
  warning: "border-l-[3px] border-l-orange-500",
  danger: "border-l-[3px] border-l-red-600",
  info: "border-l-[3px] border-l-slate-300",
} as const;

/** Ação → Risco → Oportunidade → Informação */
const priorityStyle: Record<ExecutiveCardPriority, string> = {
  action: cn(
    "border-slate-200/70 ring-1 ring-slate-900/5",
    exShadow.priorityAction,
  ),
  risk: cn(
    "border-slate-200/55 ring-1 ring-red-500/10",
    exShadow.priorityRisk,
  ),
  opportunity: cn(
    "border-slate-200/50 ring-1 ring-emerald-500/8",
    exShadow.priorityOpportunity,
  ),
  info: cn("border-slate-200/40", exShadow.xs),
  none: exShadow.card,
};

const accentToPriority = {
  none: "none",
  primary: "info",
  success: "opportunity",
  warning: "risk",
  danger: "risk",
  info: "info",
} as const satisfies Record<
  NonNullable<Props["accent"]>,
  ExecutiveCardPriority
>;

/**
 * Card executivo — hierarquia Apple/Stripe (Sprint 13.8 polish).
 */
export function ExecutiveCard({
  children,
  className,
  style,
  interactive = false,
  padding = 20,
  accent = "none",
  priority,
}: Props) {
  const level = priority ?? accentToPriority[accent];

  return (
    <div
      className={cn(
        "border bg-white dark:border-white/[0.07] dark:bg-card/95",
        exRadius[20],
        exPadding[padding],
        priorityStyle[level],
        accentBorder[accent],
        exAnimations.elevation,
        interactive &&
          cn(exAnimations.hoverLift, exAnimations.hoverScale, exAnimations.hoverPress),
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
