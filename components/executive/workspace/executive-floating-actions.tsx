"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import { gofFocusRing, gofMotion, gofShadow } from "@/lib/design-system";
import { listFabActions } from "@/lib/workspace";
import { cn } from "@/lib/utils";

/**
 * FAB mínimo — Brand oficial (Gate 19.4.1).
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
            gofMotion.fade,
          )}
        >
          {actions.map((action) => (
            <li key={action.id}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-full border-border/60 bg-card",
                  gofShadow.md,
                  gofFocusRing,
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
          "pointer-events-auto size-12 rounded-full bg-[var(--brand-graphite)] text-white",
          gofShadow.lg,
          gofFocusRing,
        )}
        aria-expanded={open}
        aria-label={open ? "Fechar ações rápidas" : "Abrir ações rápidas"}
        onClick={() => setOpen((v) => !v)}
      >
        <DsIcon icon={open ? X : Plus} size="md" className="text-white" />
      </Button>
    </div>
  );
}
