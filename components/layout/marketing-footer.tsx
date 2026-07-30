import Link from "next/link";

import { BrandLogo } from "@/components/brand";
import { brandConfig } from "@/config/brand";
import { siteConfig } from "@/config/site";

const platformLinks = [
  { title: "Recursos", href: "#recursos" },
  { title: "Plataforma", href: "#plataforma" },
  { title: "Inteligência", href: "#inteligencia" },
  { title: "Segmentos", href: "#segmentos" },
] as const;

const moduleLinks = [
  { title: "Financeiro", href: "#plataforma" },
  { title: "Vendas", href: "#plataforma" },
  { title: "Estoque", href: "#plataforma" },
  { title: "CRM", href: "#plataforma" },
  { title: "BI", href: "#plataforma" },
] as const;

const companyLinks = [
  { title: "Entrar", href: "/login" },
  { title: "Criar conta", href: "/register" },
  { title: "Suporte", href: siteConfig.links.support },
] as const;

/**
 * Footer institucional premium — apenas links reais (Sprint 25.5.2).
 */
export function MarketingFooter() {
  return (
    <footer
      data-landing-footer=""
      className="border-t border-white/10 bg-[var(--brand-black)] text-[var(--brand-silver)]"
    >
      <div className="mx-auto grid max-w-[96rem] gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4 md:col-span-2 lg:col-span-1">
          <Link href="/" aria-label={`${brandConfig.name} — início`}>
            <BrandLogo
              markSize="md"
              inverse
              officialWordmark
              showEdition
              className="max-w-[200px]"
            />
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-white/55">
            {brandConfig.positioning}
          </p>
        </div>

        <div>
          <p className="mb-3 text-[10px] font-medium tracking-[0.16em] text-[var(--brand-gold)] uppercase">
            Plataforma
          </p>
          <ul className="space-y-2 text-sm">
            {platformLinks.map((l) => (
              <li key={l.title}>
                <Link href={l.href} className="hover:text-white">
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-[10px] font-medium tracking-[0.16em] text-[var(--brand-gold)] uppercase">
            Módulos
          </p>
          <ul className="space-y-2 text-sm">
            {moduleLinks.map((l) => (
              <li key={l.title}>
                <Link href={l.href} className="hover:text-white">
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-[10px] font-medium tracking-[0.16em] text-[var(--brand-gold)] uppercase">
            Empresa
          </p>
          <ul className="space-y-2 text-sm">
            {companyLinks.map((l) => (
              <li key={l.title}>
                <Link href={l.href} className="hover:text-white">
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-white/40">
            Termos e Privacidade disponíveis no ambiente autenticado da
            plataforma.
          </p>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="mx-auto flex max-w-[96rem] flex-col gap-2 px-4 py-5 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {brandConfig.legalName}. Todos os
            direitos reservados.
          </p>
          <p className="tracking-[0.12em] uppercase">{brandConfig.edition}</p>
        </div>
      </div>
    </footer>
  );
}
