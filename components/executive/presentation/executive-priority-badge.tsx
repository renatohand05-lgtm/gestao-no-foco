import { ExecutiveBadge } from "@/components/executive";
import { PRIORITY_LABEL, type PresentationPriority } from "@/lib/executive-presentation";
import { cn } from "@/lib/utils";

type Props = {
  priority: PresentationPriority;
  className?: string;
  /** Rótulo customizado (já existente no domínio). */
  label?: string;
};

const TONE = {
  critical: "danger",
  high: "warning",
  medium: "info",
  info: "info",
} as const;

/**
 * Badge de prioridade visual — não cria prioridades de negócio.
 */
export function ExecutivePriorityBadge({
  priority,
  className,
  label,
}: Props) {
  return (
    <ExecutiveBadge
      tone={TONE[priority]}
      className={cn("font-medium normal-case tracking-normal", className)}
    >
      {label ?? PRIORITY_LABEL[priority]}
    </ExecutiveBadge>
  );
}
