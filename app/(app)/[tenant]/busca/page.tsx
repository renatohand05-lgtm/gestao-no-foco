import { ModuleHeader } from "@/components/layout/module-header";
import { MasterDataSearch } from "@/components/master-data/master-data-search";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Busca" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const { q } = await searchParams;
  await requireTenant(tenantSlug);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ModuleHeader
        title="Busca global"
        description="Localize fornecedores, clientes, produtos, categorias, planos, centros e títulos — isolado por tenant."
        breadcrumbs={[{ label: "Busca" }]}
      />
      <MasterDataSearch tenantSlug={tenantSlug} initialQuery={q ?? ""} />
    </div>
  );
}
