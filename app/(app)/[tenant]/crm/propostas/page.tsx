import { CrmEnterpriseNavigation } from "@/components/crm/crm-enterprise-navigation";
import { CrmPropostasClient } from "@/components/crm/crm-propostas-client";
import { listPropostas } from "@/lib/crm/proposta-service";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "CRM · Propostas" };
export const dynamic = "force-dynamic";

export default async function CrmPropostasPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const supabase = await createClient();

  const propostas = await listPropostas(supabase, tenant.id).catch(() => []);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <CrmEnterpriseNavigation tenantSlug={tenantSlug} active="crm/propostas" />
      <CrmPropostasClient tenantSlug={tenantSlug} initialPropostas={propostas} />
    </div>
  );
}
