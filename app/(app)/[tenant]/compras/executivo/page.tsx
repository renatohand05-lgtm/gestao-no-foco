import { ExecutiveSupplyDashboard } from "@/components/supply/executive-supply-dashboard";
import { SupplyEnterpriseNavigation } from "@/components/supply/supply-enterprise-navigation";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getExecutiveSupplyDashboard } from "@/lib/supply/supply-enterprise-actions";
import { isSupplyEnterpriseEnabled } from "@/lib/supply/supply-feature-flags";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Supply Executivo Enterprise" };

export default async function ComprasExecutivoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  if (!isSupplyEnterpriseEnabled()) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Supply Enterprise desabilitado por feature flag.
      </p>
    );
  }

  let bundle: Awaited<ReturnType<typeof getExecutiveSupplyDashboard>> | null =
    null;
  let denied: string | null = null;

  try {
    bundle = await getExecutiveSupplyDashboard(tenantSlug);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao carregar dashboard";
    if (/sem permissão|permiss/i.test(msg)) {
      denied = msg;
    } else {
      denied = msg;
    }
  }

  if (denied || !bundle) {
    return (
      <div className="space-y-4 p-6" data-phase28="compras-executivo-denied">
        <SupplyEnterpriseNavigation
          tenantSlug={tenantSlug}
          active="compras/executivo"
        />
        <Card>
          <CardHeader>
            <CardTitle>Acesso negado</CardTitle>
            <CardDescription>
              {denied ??
                "Sem permissão para o dashboard executivo de compras."}{" "}
              Use Pedidos, Cotações ou Indicadores se disponíveis no seu perfil.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <ExecutiveSupplyDashboard tenantSlug={tenantSlug} initialBundle={bundle} />
  );
}
