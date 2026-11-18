import Link from "next/link";
import { redirect } from "next/navigation";

import { PainelAgencia } from "@/components/painel-agencia/painel-agencia";
import { PainelExecutivo } from "@/components/painel-executivo/painel-executivo";
import { PainelRecorrenciaView } from "@/components/painel-recorrencia/painel-recorrencia";
import { resolveTenantNavPermissions } from "@/lib/navigation/resolve-nav-auth";
import { loadPainelAgenciaDados } from "@/lib/painel-agencia/build-data";
import { loadPainelDados } from "@/lib/painel-executivo/build-data";
import {
  carregarPainelRecorrencia,
  temCarteiraRecorrente,
} from "@/lib/painel-recorrencia/loader";
import { hasExecutiveDashboardAccess } from "@/lib/rbac/executive-access";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Painel Executivo" };
export const dynamic = "force-dynamic";

export default async function PainelExecutivoPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ versao?: string }>;
}) {
  const { tenant: slug } = await params;
  const { versao } = await searchParams;
  const tenant = await requireTenant(slug);

  const permissions = await resolveTenantNavPermissions(tenant);
  if (!hasExecutiveDashboardAccess(permissions)) {
    redirect(`/${slug}/dashboard`);
  }

  // Empresas com histórico importado da planilha (ex.: X Company) mantêm o painel da planilha;
  // `?versao=ao-vivo` mostra, na mesma empresa, o painel calculado ao vivo.
  const agencia = await loadPainelAgenciaDados(tenant.id);
  const querAoVivo = versao === "ao-vivo";
  if (agencia && !querAoVivo) {
    return (
      <PainelAgencia
        dados={agencia}
        nome={tenant.name}
        logoUrl={tenant.logo_url ?? null}
        voltarHref={`/${slug}/dashboard`}
      />
    );
  }

  // Empresas com carteira recorrente (agências, consultórios, clínicas…): painel ao vivo.
  if (versao !== "planilha" && (await temCarteiraRecorrente(tenant.id))) {
    const painel = await carregarPainelRecorrencia(tenant.id);
    return (
      <PainelRecorrenciaView
        painel={painel}
        nome={tenant.name}
        tenantSlug={slug}
        temVersaoPlanilha={Boolean(agencia)}
      />
    );
  }

  const dados = await loadPainelDados(tenant.id);

  if (!dados || dados.os.length === 0) {
    return (
      <div className="space-y-2 p-6">
        <h1 className="text-xl font-semibold">Painel Executivo</h1>
        <p className="text-sm text-muted-foreground">
          {dados
            ? "Ainda não há dados para montar o painel. Fature a primeira OS, cadastre clientes com data de entrada e valor mensal, ou importe a planilha da empresa, e os indicadores aparecem aqui automaticamente."
            : "Não foi possível carregar os dados do painel agora. Tente novamente em instantes."}
        </p>
        <Link
          href={`/${slug}/integracoes/importar/planilha`}
          className="inline-block text-sm font-medium underline underline-offset-4"
        >
          Importar a planilha da empresa
        </Link>
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
