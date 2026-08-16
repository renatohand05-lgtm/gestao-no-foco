import Link from "next/link";

import { CrmEnterpriseNavigation } from "@/components/crm/crm-enterprise-navigation";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { ReturnsPanel } from "@/components/retention/returns-panel";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClienteService } from "@/lib/clientes/cliente-service";
import {
  civilDateInTimezone,
  DEFAULT_TENANT_TIMEZONE,
} from "@/lib/dashboard/tenant-timezone";
import { retentionOpsSummary } from "@/lib/retention/kpis";
import { createCustomerReturnService } from "@/lib/retention/return-service";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Retornos e fidelização" };
export const dynamic = "force-dynamic";

export default async function CrmRetornosPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const today = civilDateInTimezone(new Date(), DEFAULT_TENANT_TIMEZONE);
  const svc = await createCustomerReturnService(tenant.id);
  const rows = await svc.list();
  const summary = retentionOpsSummary(rows, today);
  const clientes = await createClienteService(tenant.id).then((s) =>
    s.list({ perPage: 100 }),
  );
  const supabase = await createClient();
  const ids = [...new Set(rows.map((r) => r.cliente_id))];
  const { data: contato } = ids.length
    ? await supabase
        .from("clientes")
        .select("id, nome, telefone, whatsapp, email")
        .eq("tenant_id", tenant.id)
        .in("id", ids)
    : { data: [] };
  const cmap = new Map(
    (contato ?? []).map((c) => [c.id, c]),
  );
  const showVehicle =
    tenant.segment === "oficina" || tenant.segment === "lava_rapido";

  const cards: Array<[string, number | string]> = [
    ["Retornos hoje", summary.hoje],
    ["Próximos 7 dias", summary.proximos7],
    ["Próximos 30 dias", summary.proximos30],
    ["Atrasados", summary.atrasados],
    ["Contatados", summary.contatados],
    ["Agendados", summary.agendados],
    ["Clientes recuperados", summary.recuperados],
    ["Sem agendamento futuro", summary.semAgendamento],
  ];
  if (summary.receitaPotencial != null) {
    cards.push(["Receita potencial", formatCurrency(summary.receitaPotencial)]);
  }

  return (
    <div className="space-y-6">
      <CrmEnterpriseNavigation tenantSlug={tenantSlug} active="crm/retornos" />
      <CrmSubnav tenantSlug={tenantSlug} active="crm/retornos" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Retornos e fidelização
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Retorno previsto não reserva horário. Comunicação em DRY_RUN / link
          manual — WhatsApp real desativado.
        </p>
        <Link
          className="mt-2 inline-block text-sm underline"
          href={`/${tenantSlug}/centro-operacoes`}
        >
          Centro de Operações
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, n]) => (
          <Card key={label}>
            <CardHeader className="pb-1">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-xl tabular-nums">{n}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <ReturnsPanel
        tenantSlug={tenantSlug}
        showVehicle={showVehicle}
        segment={tenant.segment}
        clientes={clientes.data.map((c) => ({
          id: c.id,
          nome: c.nome,
          telefone: c.whatsapp ?? c.telefone,
          email: c.email,
        }))}
        rows={rows.map((r) => {
          const c = cmap.get(r.cliente_id);
          return {
            ...r,
            clienteNome: c?.nome ?? r.cliente_id.slice(0, 8),
            telefone: c?.whatsapp ?? c?.telefone ?? null,
            email: c?.email ?? null,
          };
        })}
      />
    </div>
  );
}
