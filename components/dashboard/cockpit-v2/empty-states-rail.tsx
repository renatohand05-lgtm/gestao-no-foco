import Link from "next/link";

import type { EmptyStateCopy } from "@/lib/dashboard/cockpit-v2/empty-states";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  items: EmptyStateCopy[];
  /** Domínios vazios detectados por dados reais */
  activeDomains: EmptyStateCopy["domain"][];
};

export function EmptyStatesRail({ tenantSlug, items, activeDomains }: Props) {
  const visible = items.filter((i) => activeDomains.includes(i.domain));
  if (visible.length === 0) return null;

  return (
    <section
      aria-label="Próximos cadastros"
      data-cockpit-block="empty-states"
      data-sprint="30.4"
      className="rounded-2xl border border-dashed border-[var(--border-premium)] bg-[var(--surface-interactive)]/30 p-4 sm:p-5"
    >
      <p className="text-[10px] font-medium tracking-[0.14em] text-[var(--brand-gold)] uppercase">
        Comece por aqui
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item) => (
          <li
            key={item.domain}
            className={cn(
              "rounded-xl border border-border/50 bg-[var(--surface-raised)] px-3 py-3",
            )}
          >
            <p className="text-sm font-medium">{item.title}.</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)] text-pretty">
              {item.body}
            </p>
            <Link
              href={`/${tenantSlug}${item.hrefSuffix}`}
              className="mt-2 inline-flex min-h-10 items-center text-xs font-medium text-[var(--brand-gold)] hover:underline"
            >
              {item.ctaLabel} →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
