import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/brand";
import { brandConfig } from "@/config/brand";
import { LandingDashboardPreview } from "@/components/marketing/landing-dashboard-preview";
import { cn } from "@/lib/utils";

/**
 * Hero institucional — primeira dobra reconstruída (Sprint 25.6.1).
 * Logo com protagonismo + composição do dashboard em escala.
 */
export function HeroSection() {
  return (
    <section
      data-landing-block="hero"
      data-landing-hero-final=""
      data-premium-v257="landing-hero"
      className="relative overflow-hidden border-b border-white/5"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,168,76,0.28),transparent_52%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 top-20 size-[32rem] rounded-full bg-[var(--brand-gold)]/12 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 size-[24rem] rounded-full bg-[var(--brand-gold)]/8 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />

      <div className="relative mx-auto grid min-h-[min(88vh,52rem)] max-w-[var(--dashboard-max-width)] items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:py-12 xl:gap-12 xl:py-14">
        <div
          className={cn(
            "flex flex-col justify-center lg:col-span-5",
            "motion-safe:animate-[landing-fade-up_0.7s_ease-out]",
          )}
        >
          <BrandLogo
            officialWordmark
            inverse
            showEdition
            className="mb-5 max-w-[min(100%,20rem)] sm:max-w-[22rem]"
          />

          <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--brand-gold)]/35 bg-[var(--brand-gold)]/12 px-3.5 py-1.5 text-[10px] font-medium tracking-[0.16em] text-[var(--brand-gold)] uppercase">
            {brandConfig.edition} · {brandConfig.subtitle}
          </p>

          <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.85rem,1.4rem+1.6vw,3rem)] font-semibold leading-[1.08] tracking-tight text-white">
            Controle total da sua empresa em uma única plataforma.
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--brand-silver)]/90 sm:text-[1.05rem]">
            Financeiro, vendas, estoque, CRM, compras, BI e inteligência
            empresarial conectados em um único centro de comando.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-gold)] px-6 py-3.5 text-sm font-semibold text-[var(--brand-navy)] shadow-[0_0_36px_rgb(201_168_76_/0.32)] transition hover:bg-[var(--brand-gold-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/60"
            >
              Começar grátis
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-medium text-white transition hover:border-[var(--brand-gold)]/40 hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40"
            >
              Entrar na plataforma
            </Link>
          </div>

          <ul className="mt-8 grid gap-2.5 text-sm text-white/60 sm:grid-cols-1">
            <li className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0 text-[var(--brand-gold)]" aria-hidden />
              Isolamento por empresa com governança real
            </li>
            <li className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0 text-[var(--brand-gold)]" aria-hidden />
              Centro de comando executivo com KPIs e fluxo
            </li>
            <li className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0 text-[var(--brand-gold)]" aria-hidden />
              Decisões com métricas reais — sem inventar dados
            </li>
          </ul>
        </div>

        <div className="relative lg:col-span-7">
          <div
            className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgb(201_168_76_/0.22),transparent_65%)] blur-2xl"
            aria-hidden
          />
          <div className="relative motion-safe:animate-[landing-fade-up_0.85s_ease-out_0.08s_both]">
            <LandingDashboardPreview className="scale-[1.02] shadow-[0_32px_100px_-20px_rgb(0_0_0_/0.75),0_0_64px_rgb(201_168_76_/0.18)] sm:scale-105" />
          </div>
        </div>
      </div>
    </section>
  );
}
