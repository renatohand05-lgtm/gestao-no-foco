"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useDemoMode } from "@/components/demo/demo-mode-provider";
import { getDemoPresentationTrail } from "@/lib/demo";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
};

/**
 * Roteiro de apresentação comercial (mesmas rotas existentes).
 */
export function DemoNavRail({ tenantSlug }: Props) {
  const { mode, active } = useDemoMode();
  const pathname = usePathname();
  const trail = getDemoPresentationTrail(tenantSlug);

  if (!active || (mode !== "commercial" && mode !== "fullscreen")) {
    return null;
  }

  return (
    <nav
      className={cn(
        "overflow-x-auto rounded-2xl border border-slate-200/60 bg-white/95 px-2 py-2 dark:border-white/10 dark:bg-card",
        exAnimations.fade,
      )}
      aria-label="Roteiro de demonstração"
    >
      <ol className="flex min-w-max items-center gap-1">
        {trail.map((step, index) => {
          const current =
            pathname === step.href ||
            (step.id !== "dashboard-return" &&
              pathname.startsWith(`${step.href}/`));
          return (
            <li key={`${step.id}-${index}`} className="flex items-center gap-1">
              {index > 0 ? (
                <span
                  className={cn(exTypography.micro, "px-1 text-muted-foreground")}
                  aria-hidden
                >
                  →
                </span>
              ) : null}
              <Link
                href={`${step.href}?demo=${mode}`}
                className={cn(
                  "rounded-xl px-2.5 py-2 text-xs font-medium transition-colors",
                  "min-h-11 inline-flex items-center",
                  exAnimations.focusRing,
                  current
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
                )}
                aria-current={current ? "page" : undefined}
              >
                {step.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
