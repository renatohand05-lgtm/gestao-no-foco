import Link from "next/link";
import { redirect } from "next/navigation";
import { TributarioHubNav } from "@/components/tax/tributario-hub-nav";
import { TaxIntelligenceClient } from "@/components/tax/tax-intelligence-client";
import {
  GFTaxAlertsList,
  GFTaxCalendarList,
  GFTaxExecutiveKpis,
} from "@/components/gf/gf-tax-executive";
import { GFSection } from "@/components/gf/gf-section";
import { getTaxExecutiveBundleAction, listTaxRulesAction } from "@/lib/tax/actions";
import { requireTaxPagePermission } from "@/lib/tax/page-auth";
import { listTaxReportKinds } from "@/lib/tax/executive";
import { gfType } from "@/lib/design-system/signature";

export const metadata = { title: "Executivo · Tributário" };

export default async function TaxExecutivoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  let auth;
  try {
    auth = await requireTaxPagePermission(tenantSlug, "tax.executivo");
  } catch {
    try {
      auth = await requireTaxPagePermission(tenantSlug);
    } catch {
      redirect(`/${tenantSlug}/dashboard`);
    }
  }

  const bundle = await getTaxExecutiveBundleAction({
    tenantId: auth.tenant.id,
    tenantSlug,
  });
  const listed = await listTaxRulesAction(auth.tenant.id);
  const evidence = listed.rules.slice(0, 5).map(
    (r) => `rule:${r.id}|v${r.version}|${r.status}|fonte:${r.sourceReference}`,
  );
  const reports = listTaxReportKinds();

  return (
    <div className="space-y-4 p-4 sm:p-6" data-tax-executive-page="">
      <h1 className={gfType.pageTitle}>Cockpit tributário</h1>
      <TributarioHubNav tenantSlug={tenantSlug} />
      <GFTaxExecutiveKpis {...bundle.cockpit} />
      <GFSection title="Calendário fiscal">
        <GFTaxCalendarList items={bundle.calendar} />
        <p className={gfType.caption}>
          Sem obrigações com fonte → indisponível (nada inventado).
        </p>
      </GFSection>
      <GFSection title="Alertas">
        <GFTaxAlertsList alerts={bundle.alerts} />
      </GFSection>
      <GFSection title="Projeções">
        <ul className="space-y-1 text-xs" data-tax-projections="">
          {bundle.projections.map((p) => (
            <li key={p.horizonDays}>
              {p.horizonDays}d · método {p.method} · confiança {p.confidence} ·{" "}
              {p.projectedAmount ?? "indisponível"}
            </li>
          ))}
        </ul>
      </GFSection>
      <GFSection title="Inteligência deterministic">
        <TaxIntelligenceClient
          tenantSlug={tenantSlug}
          evidence={evidence}
        />
      </GFSection>
      <GFSection title="Relatórios">
        <ul className="flex flex-wrap gap-2 text-xs">
          {reports.map((r) => (
            <li
              key={r}
              className="rounded-md border border-[var(--gf-border-subtle)] px-2 py-1"
            >
              {r}
            </li>
          ))}
        </ul>
        <p className={gfType.caption}>
          Export CSV/Excel/PDF via infraestrutura existente — sem falso sucesso
          de download automático nesta homologação.
        </p>
      </GFSection>
      <p className={gfType.caption}>
        <Link
          href={`/${tenantSlug}/financeiro/tributos`}
          className="text-[var(--brand-gold)] hover:underline"
        >
          Dashboard 26.7
        </Link>
      </p>
    </div>
  );
}
