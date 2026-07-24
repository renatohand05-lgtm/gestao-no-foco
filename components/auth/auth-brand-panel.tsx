import Link from "next/link";

import { BrandLogo } from "@/components/brand";
import { brandConfig } from "@/config/brand";
import { cn } from "@/lib/utils";

type AuthBrandPanelProps = {
  className?: string;
};

/**
 * Painel de marca do login — identidade oficial (Gate 19.4).
 */
export function AuthBrandPanel({ className }: AuthBrandPanelProps) {
  return (
    <div
      className={cn(
        "relative hidden overflow-hidden bg-[var(--brand-graphite)] p-10 text-white lg:flex lg:flex-col lg:justify-between",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,168,76,0.22),transparent_55%)]" />
      <div className="absolute -right-16 -top-16 size-64 rounded-full bg-[var(--brand-gold)]/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 size-72 rounded-full bg-[var(--brand-gold)]/10 blur-3xl" />

      <div className="relative">
        <Link href="/" className="inline-flex" aria-label={brandConfig.name}>
          <BrandLogo markSize="lg" showEdition inverse />
        </Link>
      </div>

      <div className="relative space-y-5">
        <p className="text-xs font-medium tracking-[0.18em] text-[var(--brand-gold)] uppercase">
          {brandConfig.edition}
        </p>
        <h1 className="max-w-md font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight tracking-tight">
          {brandConfig.slogan}
        </h1>
        <p className="max-w-sm text-sm text-white/70">
          {brandConfig.subtitle}
        </p>
      </div>

      <p className="relative text-xs text-white/55">
        © {new Date().getFullYear()} {brandConfig.name}
      </p>
    </div>
  );
}
