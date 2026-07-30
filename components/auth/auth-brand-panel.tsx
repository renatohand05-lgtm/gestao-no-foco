import Link from "next/link";

import { BrandLogo } from "@/components/brand";
import { brandConfig } from "@/config/brand";
import { cn } from "@/lib/utils";

type AuthBrandPanelProps = {
  className?: string;
};

/**
 * Painel institucional do login — identidade premium (Sprint 25.5).
 */
export function AuthBrandPanel({ className }: AuthBrandPanelProps) {
  return (
    <div
      className={cn(
        "relative hidden overflow-hidden bg-[var(--brand-navy)] p-10 text-white lg:flex lg:flex-col lg:justify-between",
        className,
      )}
      data-auth-brand-panel=""
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,168,76,0.28),transparent_55%)]" />
      <div className="absolute -right-16 -top-16 size-72 rounded-full bg-[var(--brand-gold)]/15 blur-3xl" />
      <div className="absolute -bottom-24 -left-10 size-80 rounded-full bg-[var(--brand-silver)]/10 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />

      <div className="relative">
        <Link href="/" className="inline-flex" aria-label={brandConfig.name}>
          <BrandLogo
            markSize="lg"
            showSubtitle
            showEdition
            inverse
            officialWordmark
            className="max-w-[280px]"
          />
        </Link>
      </div>

      <div className="relative space-y-5">
        <p className="text-xs font-medium tracking-[0.2em] text-[var(--brand-gold)] uppercase">
          {brandConfig.edition}
        </p>
        <h1 className="max-w-md font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
          {brandConfig.positioning}
        </h1>
        <p className="max-w-sm text-sm leading-relaxed text-[var(--brand-silver)]/90">
          {brandConfig.slogan}
        </p>
        <ul className="flex flex-wrap gap-2 pt-2" aria-label="Pilares">
          {brandConfig.pillars.map((p) => (
            <li
              key={p}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium tracking-[0.12em] text-white/70 uppercase"
            >
              {p}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-white/45">
        © {new Date().getFullYear()} {brandConfig.name}
      </p>
    </div>
  );
}
