import { notFound } from "next/navigation";

import { ClienteForm } from "@/components/clientes/cliente-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { createClienteService } from "@/lib/clientes/cliente-service";
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

  return (
    <div className="space-y-6">
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
        description="Todos os campos do módulo enterprise de clientes."
      >
        <ClienteForm tenantSlug={tenantSlug} mode="edit" cliente={cliente} />
      </SectionCard>
    </div>
  );
}
