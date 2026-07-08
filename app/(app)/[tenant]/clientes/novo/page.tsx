import { ClienteForm } from "@/components/clientes/cliente-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Novo cliente" };

export default async function NovoClientePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Novo cliente"
        description={`Cadastre um cliente em ${tenant.name}`}
        breadcrumbs={[
          { label: "Clientes", href: `/${tenantSlug}/clientes` },
          { label: "Novo cliente" },
        ]}
      />

      <SectionCard
        title="Cadastro completo"
        description="Preencha os dados do novo cliente."
      >
        <ClienteForm tenantSlug={tenantSlug} mode="create" />
      </SectionCard>
    </div>
  );
}
