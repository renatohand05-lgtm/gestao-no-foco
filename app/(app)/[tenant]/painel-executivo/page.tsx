import { redirect } from "next/navigation";

import { PainelExecutivo } from "@/components/painel-executivo/painel-executivo";
import { resolveTenantNavPermissions } from "@/lib/navigation/resolve-nav-auth";
import { loadPainelDados } from "@/lib/painel-executivo/build-data";
import { hasExecutiveDashboardAccess } from "@/lib/rbac/executive-access";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Painel Executivo" };
export const dynamic = "force-dynamic";

export default async function PainelExecutivoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const tenant = await requireTenant(slug);

  const permissions = await resolveTenantNavPermissions(tenant);
  if (!hasExecutiveDashboardAccess(permissions)) {
    redirect(`/${slug}/dashboard`);
  }

  const dados = await loadPainelDados(tenant.id);

  if (!dados || dados.os.length === 0) {
    return (
      <div className="space-y-2 p-6">
        <h1 className="text-xl font-semibold">Painel Executivo</h1>
        <p className="text-sm text-muted-foreground">
          {dados
            ? "Ainda não há ordens de serviço faturadas para montar o painel. Fature a primeira OS e os indicadores aparecem aqui automaticamente."
            : "Não foi possível carregar os dados do painel agora. Tente novamente em instantes."}
        </p>
      </div>
    );
  }

  return (
    <PainelExecutivo
      dados={dados}
      nome={tenant.name}
      logoUrl={tenant.logo_url ?? null}
      voltarHref={`/${slug}/dashboard`}
    />
  );
}
