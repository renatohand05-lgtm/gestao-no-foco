import Link from "next/link";
import { redirect } from "next/navigation";

import { TributarioHubNav } from "@/components/tax/tributario-hub-nav";
import { GFSection } from "@/components/gf/gf-section";
import { requireTaxPagePermission } from "@/lib/tax/page-auth";
import { probeTaxSchema } from "@/lib/tax/persistence/schema";
import { createClient } from "@/lib/supabase/server";
import { gfType } from "@/lib/design-system/signature";

export const metadata = { title: "Tributário Enterprise" };

export default async function TributarioHubPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  try {
    await requireTaxPagePermission(tenantSlug);
  } catch {
    redirect(`/${tenantSlug}/dashboard`);
  }

  let persistence = {
    ready: false,
    message: "Persistência não verificada",
  };
  try {
    const client = await createClient();
    const probe = await probeTaxSchema(client);
    persistence = { ready: probe.ready, message: probe.message };
  } catch {
    persistence = {
      ready: false,
      message:
        "MIGRATION PENDENTE DE APLICAÇÃO MANUAL — 20260817_tax_configuration_phase26_8.sql",
    };
  }

  const cards = [
    { href: `/${tenantSlug}/tributario/regras`, label: "Regras e workflow" },
    { href: `/${tenantSlug}/tributario/simulador`, label: "Simulador avançado" },
    { href: `/${tenantSlug}/tributario/executivo`, label: "Cockpit executivo" },
    {
      href: `/${tenantSlug}/financeiro/tributos`,
      label: "Inteligência 26.7 (legado)",
    },
  ];

  return (
    <div
      className="space-y-4 p-4 sm:p-6"
      data-tributario-hub=""
      data-sprint="26.8-10"
    >
      <div>
        <h1 className={gfType.pageTitle}>Tributário Enterprise</h1>
        <p className={gfType.body}>
          Configuração versionada · simulação isolada · visão executiva · sem
          parecer jurídico automático.
        </p>
      </div>
      <TributarioHubNav tenantSlug={tenantSlug} />
      <GFSection title="Persistência" surface="raised">
        <p
          className={gfType.body}
          data-tax-persistence-ready={persistence.ready ? "1" : "0"}
        >
          {persistence.message}
        </p>
        {!persistence.ready ? (
          <p className={gfType.caption} data-migration-pending="">
            MIGRATION NECESSÁRIA: SIM — pendente de aplicação manual.
          </p>
        ) : null}
      </GFSection>
      <GFSection title="Módulos" surface="raised">
        <ul className="grid gap-2 sm:grid-cols-2">
          {cards.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                className="block rounded-xl border border-[var(--gf-border-subtle)] p-3 hover:border-[var(--gf-border-active)]"
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </GFSection>
    </div>
  );
}
