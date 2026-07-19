import { OsOpenForm } from "@/components/ordens/os-open-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Nova OS" };

export default async function NovaOsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const supabase = await createClient();

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nome")
    .eq("tenant_id", tenant.id)
    .is("deleted_at", null)
    .order("nome")
    .limit(500);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Nova ordem de serviço"
        description="Entrada do veículo e abertura operacional"
        breadcrumbs={[
          { label: "Ordens", href: `/${tenantSlug}/ordens` },
          { label: "Nova" },
        ]}
      />
      <SectionCard
        title="Abertura"
        description="Orçamento ainda não existe — nenhum impacto em DRE, estoque ou caixa."
      >
        <OsOpenForm
          tenantSlug={tenantSlug}
          clientes={(clientes ?? []).map((c) => ({ id: c.id, nome: c.nome }))}
        />
      </SectionCard>
    </div>
  );
}
