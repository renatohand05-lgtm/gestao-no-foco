import { CrmSubnav } from "@/components/crm/crm-subnav";
import { CrmTarefasList } from "@/components/crm/crm-tarefas-list";
import { ModuleHeader } from "@/components/layout/module-header";
import { createClienteTarefaService } from "@/lib/crm/cliente-tarefa-service";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Tarefas CRM" };

export default async function ClientesTarefasPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createClienteTarefaService(tenant.id);
  const tarefas = await service.listAbertas(200);

  const supabase = await createClient();
  const clienteIds = [...new Set(tarefas.map((t) => t.cliente_id))];
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
      <CrmSubnav tenantSlug={tenantSlug} active="clientes/tarefas" />
      <ModuleHeader
        title="Tarefas comerciais"
        description="Ligações, propostas, cobranças e follow-ups"
        breadcrumbs={[
          { label: "Clientes", href: `/${tenantSlug}/clientes` },
          { label: "Tarefas" },
        ]}
      />
      <CrmTarefasList
        tenantSlug={tenantSlug}
        tarefas={tarefas}
        showClienteLink
        clientesMap={clientesMap}
      />
    </div>
  );
}
