import { cn } from "@/lib/utils";
import {
  gofCardPaddingFromEx,
  gofCardSurface,
  gofInteractive,
} from "@/lib/design-system/primitives";

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
  /** Hover lift discreto — foco permanece nos controles internos. */
  interactive?: boolean;
  /** Padding legado (8–32) mapeado para escala gof */
  padding?: 8 | 12 | 16 | 20 | 24 | 32;
  accent?: "primary" | "success" | "warning" | "danger" | "info" | "none";
  priority?: ExecutiveCardPriority;
  /** Slot de cabeçalho opcional */
  header?: React.ReactNode;
  /** Slot de rodapé opcional */
  footer?: React.ReactNode;
};

const accentBorder = {
  none: "",
  primary: "border-l-[3px] border-l-[var(--brand-gold)]",
  success: "border-l-[3px] border-l-success",
  warning: "border-l-[3px] border-l-warning",
  danger: "border-l-[3px] border-l-danger",
  info: "border-l-[3px] border-l-[var(--brand-info)]",
} as const;

const priorityStyle: Record<ExecutiveCardPriority, string> = {
  action: "ring-1 ring-[var(--brand-graphite)]/5",
  risk: "ring-1 ring-danger/15",
  opportunity: "ring-1 ring-success/15",
  info: "",
  none: "",
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
 * Card executivo — superfície canônica Gate 19.0.2.
 * Mesmo raio / padding / shadow que Panel e MetricCard.
 */
export function ExecutiveCard({
  children,
  className,
  style,
  interactive = false,
  padding = 20,
  accent = "none",
  priority,
  header,
  footer,
}: Props) {
  const level = priority ?? accentToPriority[accent];

  return (
    <div
      className={cn(
        gofCardSurface,
        gofCardPaddingFromEx[padding],
        priorityStyle[level],
        accentBorder[accent],
        interactive && gofInteractive,
        className,
      )}
      style={style}
    >
      {header ? <div className="mb-4">{header}</div> : null}
      {children}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}
