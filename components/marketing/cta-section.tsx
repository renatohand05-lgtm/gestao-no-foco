import Image from "next/image";
import Link from "next/link";

import { brandAssets, brandConfig } from "@/config/brand";
import { siteConfig } from "@/config/site";

/**
 * CTA final premium (Sprint 25.5.2).
 */
export function CtaSection() {
  return (
    <section
      id="cta"
      data-landing-block="cta"
      className="relative py-20 sm:py-24"
    >
      <div className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--brand-gold)]/30 bg-[var(--brand-graphite)] px-6 py-12 shadow-[0_0_60px_rgb(201_168_76_/0.12)] sm:px-12 sm:py-16">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,168,76,0.2),transparent_55%)]"
            aria-hidden
          />
          <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
            <Image
              src={brandAssets.icon64}
              alt=""
              width={48}
              height={48}
              className="mb-5 size-12 rounded-xl object-cover ring-1 ring-[var(--brand-gold)]/30"
            />
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {brandConfig.positioning}
            </h2>
            <p className="mt-4 text-[var(--brand-silver)]/85">
              Comece grátis ou fale com o time de suporte para entender o
              encaixe no seu segmento.
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-xl bg-[var(--brand-gold)] px-6 py-3 text-sm font-semibold text-[var(--brand-navy)] transition hover:bg-[var(--brand-gold-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/60"
              >
                Começar grátis
              </Link>
              <Link
                href={siteConfig.links.support}
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:border-[var(--brand-gold)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40"
              >
                Falar com especialista
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
