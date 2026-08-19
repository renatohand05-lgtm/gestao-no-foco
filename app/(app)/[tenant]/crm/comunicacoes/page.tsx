import { CrmEnterpriseNavigation } from "@/components/crm/crm-enterprise-navigation";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { CommunicationCenter } from "@/components/retention/communication-center";
import { createClienteService } from "@/lib/clientes/cliente-service";
import { loadCommunicationCenter } from "@/lib/retention/center-service";
import { tenantHasMutationPermission } from "@/lib/rbac/mutation-auth";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Comunicações" };
export const dynamic = "force-dynamic";

export default async function CrmComunicacoesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    from?: string;
    to?: string;
    clienteId?: string;
    channel?: string;
    status?: string;
    origin?: string;
  }>;
}) {
  const { tenant: tenantSlug } = await params;
  const filters = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const [data, clientes, canResend] = await Promise.all([
    loadCommunicationCenter({
      tenantId: tenant.id,
      from: filters.from ? `${filters.from}T00:00:00.000Z` : undefined,
      to: filters.to ? `${filters.to}T23:59:59.999Z` : undefined,
      clienteId: filters.clienteId || undefined,
      channel: filters.channel || undefined,
      status: filters.status || undefined,
      origin: filters.origin || undefined,
    }),
    createClienteService(tenant.id).then((s) => s.list({ perPage: 100 })),
    tenantHasMutationPermission(tenantSlug, "crm.notificacoes.enviar"),
  ]);

  return (
    <div className="space-y-6">
      <CrmEnterpriseNavigation tenantSlug={tenantSlug} active="crm/comunicacoes" />
      <CrmSubnav tenantSlug={tenantSlug} active="crm/comunicacoes" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comunicações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Histórico de avisos aos clientes desta empresa. Envio real só em
          COMMUNICATION_MODE=test para destinatários da allowlist.
        </p>
      </div>
      <CommunicationCenter
        tenantSlug={tenantSlug}
        kpis={data.kpis}
        rows={data.rows}
        clientes={clientes.data.map((c) => ({ id: c.id, nome: c.nome }))}
        canResend={canResend}
        canSeeDetails={canResend}
        filters={filters}
      />
    </div>
  );
}
