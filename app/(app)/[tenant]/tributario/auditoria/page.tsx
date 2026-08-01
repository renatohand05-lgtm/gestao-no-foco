import { redirect } from "next/navigation";
import { TributarioHubNav } from "@/components/tax/tributario-hub-nav";
import { GFTaxAuditTimeline } from "@/components/gf/gf-tax-admin";
import { GFSection } from "@/components/gf/gf-section";
import { getTaxAuditAction } from "@/lib/tax/actions";
import { requireTaxPagePermission } from "@/lib/tax/page-auth";
import { gfType } from "@/lib/design-system/signature";

export const metadata = { title: "Auditoria · Tributário" };

export default async function TaxAuditoriaPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  let auth;
  try {
    auth = await requireTaxPagePermission(tenantSlug, "tax.ver_auditoria");
  } catch {
    try {
      auth = await requireTaxPagePermission(tenantSlug);
    } catch {
      redirect(`/${tenantSlug}/dashboard`);
    }
  }
  const audit = await getTaxAuditAction(auth.tenant.id);
  return (
    <div className="space-y-4 p-4 sm:p-6" data-tax-audit-page="">
      <h1 className={gfType.pageTitle}>Auditoria tributária</h1>
      <TributarioHubNav tenantSlug={tenantSlug} />
      <GFSection title="Trilha">
        {!audit.ready ? (
          <p className={gfType.body}>{audit.message}</p>
        ) : (
          <GFTaxAuditTimeline
            events={audit.rows.map((r) => ({
              id: String(r.id),
              action: String(r.action),
              createdAt: String(r.created_at),
              actorId: String(r.actor_id),
            }))}
          />
        )}
      </GFSection>
    </div>
  );
}
