"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type MoreDetailsProps = {
  summary: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
};

/**
 * Sprint 35.2.1 — progressive disclosure operacional.
 * Campos avançados recolhidos por padrão; acessíveis no mesmo formulário.
 */
export const FAST_INPUT_CTA_CLASS =
  "sticky bottom-0 z-10 mt-4 flex flex-col-reverse gap-2 border-t bg-background/95 py-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:py-0 sm:backdrop-blur-none sm:flex-row sm:justify-end";

export function FastInputCtaBar({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={FAST_INPUT_CTA_CLASS} data-fast-input="cta">
      {children}
    </div>
  );
}

export function MoreDetails({
  summary,
  children,
  className,
  defaultOpen = false,
}: MoreDetailsProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className={cn(
        "group rounded-xl border border-border/60 bg-card/40",
        className,
      )}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      data-fast-input="more-details"
    >
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium",
          "marker:content-none [&::-webkit-details-marker]:hidden",
        )}
      >
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        {summary}
      </summary>
      <div className="space-y-6 border-t px-4 py-4 md:px-6">{children}</div>
    </details>
  );
}
