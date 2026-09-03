import { ModuleHeader } from "@/components/layout/module-header";
import { SalaoBoard } from "@/components/salao/salao-board";
import { listMesasAction, listOpenComandasAction } from "@/lib/restaurante/mesas-actions";

export const metadata = { title: "Salão" };

export default async function SalaoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  const [mesasResult, comandasResult] = await Promise.all([
    listMesasAction(tenantSlug),
    listOpenComandasAction(tenantSlug),
  ]);

  const mesas = mesasResult.success ? mesasResult.mesas : [];
  const comandas = comandasResult.success ? comandasResult.comandas : [];
  const loadError = !mesasResult.success
    ? mesasResult.error
    : !comandasResult.success
      ? comandasResult.error
      : null;

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Salão"
        description="Controle de mesas e comandas do restaurante"
        breadcrumbs={[{ label: "Salão" }]}
      />
      <SalaoBoard
        tenantSlug={tenantSlug}
        initialMesas={mesas}
        initialComandas={comandas}
        loadError={loadError}
      />
    </div>
  );
}
