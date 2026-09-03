import { ModuleHeader } from "@/components/layout/module-header";
import { CozinhaBoard } from "@/components/cozinha/cozinha-board";
import { listKitchenItemsAction } from "@/lib/restaurante/cozinha-actions";

export const metadata = { title: "Cozinha" };

export default async function CozinhaPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const result = await listKitchenItemsAction(tenantSlug);
  const items = result.success ? result.items : [];
  const loadError = result.success ? null : result.error;

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Cozinha"
        description="Fila de preparo das comandas abertas"
        breadcrumbs={[{ label: "Cozinha" }]}
      />
      <CozinhaBoard
        tenantSlug={tenantSlug}
        initialItems={items}
        loadError={loadError}
      />
    </div>
  );
}
