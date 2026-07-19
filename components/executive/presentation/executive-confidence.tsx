import { ExecutiveBadge } from "@/components/executive";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Level = "baixa" | "media" | "alta";

type Props = {
  level: Level;
  reason?: string | null;
  className?: string;
};

const TONE = {
  baixa: "warning",
  media: "info",
  alta: "success",
} as const;

const LABEL = {
  baixa: "Confiança baixa",
  media: "Confiança média",
  alta: "Confiança alta",
} as const;

/**
 * Confiança já existente — tooltip opcional com motivo.
 */
export function ExecutiveConfidence({ level, reason, className }: Props) {
  const badge = (
    <ExecutiveBadge
      tone={TONE[level]}
      className={cn("font-medium normal-case tracking-normal", className)}
    >
      {LABEL[level]}
    </ExecutiveBadge>
  );

  if (!reason?.trim()) return badge;

  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          className={cn(
            "inline-flex rounded-full",
            exAnimations.focusRing,
            exAnimations.touchTarget,
            "min-h-0 min-w-0 items-center",
          )}
          aria-label={`${LABEL[level]}. ${reason}`}
        >
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className={exTypography.caption}>{reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
