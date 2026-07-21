import { ClienteForm } from "@/components/clientes/cliente-form";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { ensureCrmDefaultTags } from "@/lib/crm/crm-tags";
import { listTenantMembersForSelect } from "@/lib/crm/tenant-team-service";
import { MasterDataRepository } from "@/lib/master-data/master-data-repository";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Novo cliente" };

export default async function NovoClientePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  await ensureCrmDefaultTags(tenant.id);
  const supabase = await createClient();
  const repo = new MasterDataRepository(supabase, tenant.id);
  const [tags, consultores] = await Promise.all([
    repo.listTags(),
    listTenantMembersForSelect(tenant.id),
  ]);

  return (
    <div className="space-y-6">
      <CrmSubnav tenantSlug={tenantSlug} active="clientes" />
      <ModuleHeader
        title="Novo cliente"
        description={`Cadastre um cliente em ${tenant.name}`}
        breadcrumbs={[
          { label: "Clientes", href: `/${tenantSlug}/clientes` },
          { label: "Novo cliente" },
        ]}
      />

      <SectionCard
        title="Cadastro inteligente"
        description="CPF/CNPJ, origem, classificação, score, consultor e etiquetas."
      >
        <ClienteForm
          tenantSlug={tenantSlug}
          mode="create"
          tags={tags}
          consultores={consultores}
        />
      </SectionCard>
    </div>
  );
}
