import { ClienteForm } from "@/components/clientes/cliente-form";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { ensureCrmDefaultTags } from "@/lib/crm/crm-tags";
import { listTenantMembersForSelect } from "@/lib/crm/tenant-team-service";
import { MasterDataRepository } from "@/lib/master-data/master-data-repository";
import { getSegmentUiCopy } from "@/lib/segments/copy.ts";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Novo cliente" };

export default async function NovoClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ from?: string; tipo?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const { from, tipo } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  await ensureCrmDefaultTags(tenant.id);
  const supabase = await createClient();
  const repo = new MasterDataRepository(supabase, tenant.id);
  const [tags, consultores] = await Promise.all([
    repo.listTags(),
    listTenantMembersForSelect(tenant.id),
  ]);
  const ui = getSegmentUiCopy({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });

  return (
    <div className="space-y-6">
      <CrmSubnav tenantSlug={tenantSlug} active="clientes" />
      <ModuleHeader
        title={`Novo ${ui.customer.toLowerCase()}`}
        description="Cadastre o mínimo agora. Complete depois."
        breadcrumbs={[
          { label: ui.customers, href: `/${tenantSlug}/clientes` },
          { label: `Novo ${ui.customer.toLowerCase()}` },
        ]}
      />

      <SectionCard
        title="Cadastro rápido"
        description="Nome é o suficiente para começar. WhatsApp, e-mail e o restante podem ser completados depois."
      >
        <ClienteForm
          tenantSlug={tenantSlug}
          mode="create"
          tags={tags}
          consultores={consultores}
          from={from}
          customerLabel={ui.customer}
          defaultRelationship={tipo === "negocio" ? "negocio" : "atendimento"}
          allowBusiness
        />
      </SectionCard>
    </div>
  );
}
