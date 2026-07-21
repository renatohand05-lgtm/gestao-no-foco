import { CrmAgendaList } from "@/components/crm/crm-agenda-list";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { ModuleHeader } from "@/components/layout/module-header";
import { createClienteAgendaService } from "@/lib/crm/cliente-agenda-service";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Agenda CRM" };

export default async function ClientesAgendaPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 30);

  const service = await createClienteAgendaService(tenant.id);
  const agendamentos = await service.listPeriodo(from.toISOString(), to.toISOString());

  const supabase = await createClient();
  const clienteIds = [...new Set(agendamentos.map((a) => a.cliente_id))];
  const clientesMap: Record<string, string> = {};

  if (clienteIds.length) {
    const { data } = await supabase
      .from("clientes")
      .select("id, nome")
      .eq("tenant_id", tenant.id)
      .in("id", clienteIds);
    for (const row of data ?? []) {
      clientesMap[row.id] = row.nome;
    }
  }

  return (
    <div className="space-y-6">
      <CrmSubnav tenantSlug={tenantSlug} active="clientes/agenda" />
      <ModuleHeader
        title="Agenda de relacionamento"
        description="Compromissos com clientes nos próximos 30 dias"
        breadcrumbs={[
          { label: "Clientes", href: `/${tenantSlug}/clientes` },
          { label: "Agenda" },
        ]}
      />
      <CrmAgendaList
        tenantSlug={tenantSlug}
        agendamentos={agendamentos}
        clientesMap={clientesMap}
      />
    </div>
  );
}
