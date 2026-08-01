import Link from "next/link";
import { redirect } from "next/navigation";

import { GFSection } from "@/components/gf/gf-section";
import { requireIntelligencePagePermission } from "@/lib/intelligence/enterprise/page-auth";
import { gfType } from "@/lib/design-system/signature";

export const metadata = { title: "Inteligência Enterprise" };

export default async function InteligenciaHubPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  try {
    await requireIntelligencePagePermission(tenantSlug);
  } catch {
    redirect(`/${tenantSlug}/dashboard`);
  }

  const links = [
    { href: `/${tenantSlug}/inteligencia/copiloto`, label: "Copiloto" },
    { href: `/${tenantSlug}/inteligencia/historico`, label: "Histórico" },
    { href: `/${tenantSlug}/inteligencia/auditoria`, label: "Auditoria" },
    { href: `/${tenantSlug}/inteligencia/configuracoes`, label: "Configurações" },
  ];

  return (
    <div
      className="space-y-4 p-4 sm:p-6"
      data-page-transition=""
      data-sprint="27"
      data-intelligence-hub=""
    >
      <div>
        <h1 className={gfType.pageTitle}>Inteligência Enterprise</h1>
        <p className={gfType.body}>
          Centro de comando inteligente · deterministic por padrão · sem inventar
          dados.
        </p>
      </div>
      <GFSection title="Módulos" surface="raised">
        <ul className="grid gap-2 sm:grid-cols-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="block rounded-xl border border-[var(--gf-border-subtle)] p-3 hover:border-[var(--gf-border-active)]"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </GFSection>
    </div>
  );
}
