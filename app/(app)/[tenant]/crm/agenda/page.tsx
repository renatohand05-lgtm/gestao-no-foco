import Link from "next/link";

import { CrmEnterpriseNavigation } from "@/components/crm/crm-enterprise-navigation";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Agenda CRM" };

export default async function CrmAgendaPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  return (
    <div className="space-y-6">
      <CrmEnterpriseNavigation tenantSlug={tenantSlug} active="crm/agenda" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agenda comercial</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ligações, visitas, reuniões, retornos, tarefas e follow-ups reutilizam{" "}
          <code>cliente_agendamentos</code> e <code>cliente_tarefas</code>.
        </p>
      </div>
      <ul className="list-inside list-disc space-y-2 text-sm">
        <li>
          <Link className="underline underline-offset-2" href={`/${tenantSlug}/clientes/agenda`}>
            Agenda operacional (30 dias)
          </Link>
        </li>
        <li>
          <Link className="underline underline-offset-2" href={`/${tenantSlug}/clientes/tarefas`}>
            Tarefas / follow-ups
          </Link>
        </li>
      </ul>
    </div>
  );
}
