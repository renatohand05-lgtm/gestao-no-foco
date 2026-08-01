"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type Panel = {
  id: string;
  title: string;
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

type Props = {
  panels: Panel[];
  className?: string;
};

/**
 * Progressive disclosure — reduz altura sem esconder informação (Sprint 25.6).
 */
export function PremiumDisclosure({ panels, className }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(panels.map((p) => [p.id, Boolean(p.defaultOpen)])),
  );

  return (
    <div
      className={cn("space-y-3", className)}
      data-premium-block="disclosure"
    >
      {panels.map((panel) => {
        const isOpen = open[panel.id] ?? false;
        return (
          <section
            key={panel.id}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--elevation-card)]"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`premium-panel-${panel.id}`}
              id={`premium-trigger-${panel.id}`}
              onClick={() =>
                setOpen((prev) => ({ ...prev, [panel.id]: !prev[panel.id] }))
              }
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors duration-[var(--gf-motion-micro)] ease-[var(--gf-ease)] hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-gold)]/40"
            >
              <span className="min-w-0">
                <span className="block font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                  {panel.title}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--text-secondary)] text-pretty">
                  {panel.summary}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
                  isOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            {isOpen ? (
              <div
                id={`premium-panel-${panel.id}`}
                role="region"
                aria-labelledby={`premium-trigger-${panel.id}`}
                className="border-t border-border px-4 py-4"
              >
                {panel.children}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
