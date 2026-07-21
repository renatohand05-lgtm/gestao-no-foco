import { notFound } from "next/navigation";

import { ClienteFeedback } from "@/components/clientes/cliente-feedback";
import { ClienteWorkspace } from "@/components/clientes/cliente-workspace";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { createCliente360Service } from "@/lib/crm/cliente-360-service";
import { listTenantMembersForSelect } from "@/lib/crm/tenant-team-service";
import { createClienteService } from "@/lib/clientes/cliente-service";
import { requireTenant } from "@/lib/tenants";
import type { ClienteSuccessMessage } from "@/types/clientes";

export const metadata = { title: "Detalhes do cliente" };

export default async function ClienteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const { success, error } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createClienteService(tenant.id);
  const cliente = await service.getById(id);

  if (!cliente) {
    notFound();
  }

  const [data360, consultores] = await Promise.all([
    createCliente360Service(tenant.id).then((s) => s.load(id)),
    listTenantMembersForSelect(tenant.id),
  ]);

  const consultorNome =
    consultores.find((c) => c.id === cliente.consultor_id)?.nome ?? null;

  return (
    <div className="space-y-6">
      <CrmSubnav tenantSlug={tenantSlug} active="clientes" />
      <ClienteFeedback
        success={success as ClienteSuccessMessage | undefined}
        error={error}
      />
      <ClienteWorkspace
        tenantSlug={tenantSlug}
        cliente={cliente}
        data360={data360}
        consultorNome={consultorNome}
      />
    </div>
  );
}
