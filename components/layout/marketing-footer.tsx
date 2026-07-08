import Link from "next/link";

import { siteConfig } from "@/config/site";

export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto flex flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">{siteConfig.name}</p>
          <p className="text-sm text-muted-foreground">
            Gestão empresarial inteligente para o seu negócio.
          </p>
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
