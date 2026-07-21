import { notFound } from "next/navigation";

import { ClienteForm } from "@/components/clientes/cliente-form";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { createClienteService } from "@/lib/clientes/cliente-service";
import { ensureCrmDefaultTags } from "@/lib/crm/crm-tags";
import { listTenantMembersForSelect } from "@/lib/crm/tenant-team-service";
import { MasterDataRepository } from "@/lib/master-data/master-data-repository";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Editar cliente" };

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createClienteService(tenant.id);
  const cliente = await service.getById(id);

  if (!cliente) {
    notFound();
  }

  await ensureCrmDefaultTags(tenant.id);
  const supabase = await createClient();
  const repo = new MasterDataRepository(supabase, tenant.id);
  const [tags, consultores, initialTagIds] = await Promise.all([
    repo.listTags(),
    listTenantMembersForSelect(tenant.id),
    repo.listEntityTagIds("cliente", id),
  ]);

  return (
    <div className="space-y-6">
      <CrmSubnav tenantSlug={tenantSlug} active="clientes" />
      <ModuleHeader
        title="Editar cliente"
        description={`Atualize os dados de ${cliente.nome}`}
        breadcrumbs={[
          { label: "Clientes", href: `/${tenantSlug}/clientes` },
          { label: cliente.nome, href: `/${tenantSlug}/clientes/${cliente.id}` },
          { label: "Editar" },
        ]}
      />

      <SectionCard
        title="Cadastro completo"
        description="Todos os campos do CRM enterprise."
      >
        <ClienteForm
          tenantSlug={tenantSlug}
          mode="edit"
          cliente={cliente}
          tags={tags}
          consultores={consultores}
          initialTagIds={initialTagIds}
        />
      </SectionCard>
    </div>
  );
}
