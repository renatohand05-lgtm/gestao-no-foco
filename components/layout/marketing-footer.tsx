import Link from "next/link";

import { BrandLogo } from "@/components/brand";
import { brandConfig } from "@/config/brand";
import { siteConfig } from "@/config/site";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 bg-[var(--brand-gray-light)]">
      <div className="container mx-auto flex flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <BrandLogo markSize="sm" showEdition />
          <p className="text-sm text-muted-foreground">{brandConfig.slogan}</p>
        </div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <Link href="#recursos" className="hover:text-foreground">
            Recursos
          </Link>
          <Link href="#segmentos" className="hover:text-foreground">
            Segmentos
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Entrar
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
      </div>
    </footer>
  );
}
