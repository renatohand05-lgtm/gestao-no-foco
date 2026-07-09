import { notFound } from "next/navigation";

import { FormaPagamentoForm } from "@/components/financeiro/forma-pagamento-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { createFormaPagamentoService } from "@/lib/financeiro/forma-pagamento-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Editar" };

export default async function EditarPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createFormaPagamentoService(tenant.id);
  const item = await service.getById(id);

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={`Editar ${item.nome}`}
        description={`Atualize o registro em ${tenant.name}`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Formas de Pagamento", href: `/${tenantSlug}/financeiro/formas-pagamento` },
          {
            label: item.nome,
            href: `/${tenantSlug}/financeiro/formas-pagamento/${item.id}`,
          },
          { label: "Editar" },
        ]}
      />

      <SectionCard title="Cadastro" description="Atualize os dados do registro.">
        <FormaPagamentoForm tenantSlug={tenantSlug} mode="edit" item={item} />
      </SectionCard>
    </div>
  );
}
