import { ModuleHeader } from "@/components/layout/module-header";
import { DeliveryBoard } from "@/components/delivery/delivery-board";
import { listDeliveryOrdersAction } from "@/lib/restaurante/delivery-actions";

export const metadata = { title: "Delivery" };

export default async function DeliveryPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const result = await listDeliveryOrdersAction(tenantSlug);
  const orders = result.success ? result.orders : [];
  const loadError = result.success ? null : result.error;

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Delivery"
        description="Pedidos de entrega em preparo e prontos para sair"
        breadcrumbs={[{ label: "Delivery" }]}
      />
      <DeliveryBoard
        tenantSlug={tenantSlug}
        initialOrders={orders}
        loadError={loadError}
      />
    </div>
  );
}
