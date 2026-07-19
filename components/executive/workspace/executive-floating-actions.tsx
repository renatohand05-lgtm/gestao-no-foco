"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import { exAnimations } from "@/lib/design-system";
import { listFabActions } from "@/lib/workspace";
import { cn } from "@/lib/utils";

/**
 * FAB mínimo — só criações (Sprint 12.3). Export fica no menu da toolbar.
 */
export function ExecutiveFloatingActions() {
  const [open, setOpen] = useState(false);
  const actions = listFabActions().filter((a) =>
    ["nova_venda", "nova_conta", "nova_meta"].includes(a.id),
  );

  return (
    <div className="pointer-events-none fixed bottom-5 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-8 sm:right-8">
      {open ? (
        <ul
          className={cn(
            "pointer-events-auto flex flex-col items-end gap-2",
            exAnimations.scale,
          )}
        >
          {actions.map((action) => (
            <li key={action.id}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-full border-slate-200 bg-white shadow-lg dark:border-white/10",
                  exAnimations.focusRing,
                  exAnimations.hoverLift,
                )}
                onClick={() => setOpen(false)}
              >
                {action.label}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <Button
        type="button"
        size="icon"
        className={cn(
          "pointer-events-auto size-12 rounded-full bg-blue-600 text-white shadow-xl",
          exAnimations.focusRing,
          exAnimations.hoverGlow,
          exAnimations.hoverPress,
        )}
        aria-expanded={open}
        aria-label={open ? "Fechar" : "Novo"}
        onClick={() => setOpen((v) => !v)}
      >
        <DsIcon icon={open ? X : Plus} size="md" className="text-white" />
      </Button>
    </div>
  );
}
