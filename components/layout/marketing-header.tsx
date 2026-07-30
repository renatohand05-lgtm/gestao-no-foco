"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { BrandLogo } from "@/components/brand";
import { marketingNav } from "@/config/navigation";
import { brandConfig } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * Header público premium — navy, logo oficial, CTAs dourados (Sprint 25.5.2).
 */
export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      data-landing-header=""
      data-scrolled={scrolled ? "true" : "false"}
      className={cn(
        "sticky top-0 z-50 w-full transition-[background,border,box-shadow] duration-300",
        scrolled
          ? "border-b border-white/10 bg-[var(--brand-navy)]/92 shadow-[0_8px_32px_rgb(0_0_0_/0.35)] backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[96rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex min-w-0 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/50"
          aria-label={`${brandConfig.name} — início`}
        >
          <BrandLogo
            markSize="lg"
            inverse
            officialWordmark
            className="max-w-[220px] sm:max-w-[260px] lg:max-w-[280px]"
          />
        </Link>

        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Principal"
        >
          {marketingNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-[var(--brand-silver)]/85 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40"
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--brand-silver)] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--brand-gold)] px-4 py-2 text-sm font-semibold text-[var(--brand-navy)] shadow-[0_0_24px_rgb(201_168_76_/0.25)] transition hover:bg-[var(--brand-gold-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/60"
          >
            Começar grátis
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-xl border border-white/10 text-white lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/50"
          aria-expanded={open}
          aria-controls="landing-mobile-nav"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div
          id="landing-mobile-nav"
          className="border-t border-white/10 bg-[var(--brand-navy)]/98 px-4 py-4 backdrop-blur-md lg:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {marketingNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm text-[var(--brand-silver)] hover:bg-white/5 hover:text-white"
              >
                {item.title}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-center text-sm text-white hover:bg-white/5"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-[var(--brand-gold)] px-3 py-3 text-center text-sm font-semibold text-[var(--brand-navy)]"
              >
                Começar grátis
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
