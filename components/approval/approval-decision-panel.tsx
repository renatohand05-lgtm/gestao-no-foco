"use client";

import { Button } from "@/components/ui/button";
import type { ApprovalDecisionType } from "@/lib/approval";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  disabled?: boolean;
  className?: string;
  onDecide?: (type: ApprovalDecisionType) => void;
};

const ACTIONS: { type: ApprovalDecisionType; label: string; variant: "default" | "outline" | "destructive" }[] = [
  { type: "APPROVE", label: "Aprovar", variant: "default" },
  { type: "REJECT", label: "Rejeitar", variant: "destructive" },
  { type: "RETURN_FOR_ADJUSTMENT", label: "Devolver", variant: "outline" },
  { type: "CANCEL", label: "Cancelar", variant: "outline" },
];

/**
 * Painel de decisão — apenas dispara callbacks.
 * Regras ficam no Approval Engine.
 */
export function ApprovalDecisionPanel({
  disabled,
  className,
  onDecide,
}: Props) {
  return (
    <div
      data-approval-decision-panel
      className={cn("space-y-3 rounded-xl border border-border/60 p-3", className)}
    >
      <p className={gofTypography.caption}>Decisão</p>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <Button
            key={action.type}
            type="button"
            variant={action.variant}
            disabled={disabled || !onDecide}
            onClick={() => onDecide?.(action.type)}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
