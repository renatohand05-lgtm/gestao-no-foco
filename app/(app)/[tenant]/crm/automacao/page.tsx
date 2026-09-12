import { CrmEnterpriseNavigation } from "@/components/crm/crm-enterprise-navigation";
import { CrmAutomacaoClient } from "@/components/crm/crm-automacao-client";
import { listSequences } from "@/lib/crm/sequence-service";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "CRM · Automação" };
export const dynamic = "force-dynamic";

export default async function CrmAutomacaoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const supabase = await createClient();

  const sequences = await listSequences(supabase, tenant.id).catch(() => []);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <CrmEnterpriseNavigation tenantSlug={tenantSlug} active="crm/automacao" />
      <CrmAutomacaoClient tenantSlug={tenantSlug} initialSequences={sequences} />
    </div>
  );
}
