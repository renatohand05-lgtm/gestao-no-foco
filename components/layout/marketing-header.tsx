import Link from "next/link";

import { BrandLogo } from "@/components/brand";
import { marketingNav } from "@/config/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-[var(--brand-white)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--brand-white)]/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <BrandLogo markSize="md" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {marketingNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
            Entrar
          </Link>
          <Link href="/register" className={cn(buttonVariants())}>
            Começar grátis
          </Link>
        </div>
      </div>
    </header>
  );
}
