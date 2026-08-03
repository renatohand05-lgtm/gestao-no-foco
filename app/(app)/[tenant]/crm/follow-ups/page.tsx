import { CrmEnterpriseNavigation } from "@/components/crm/crm-enterprise-navigation";
import { FollowUpPremiumPanel } from "@/components/crm/premium/follow-up-panel";
import { groupPremiumFollowUps } from "@/lib/crm/premium/follow-up-buckets";
import type { FollowUpItem } from "@/lib/crm/phase28/follow-up-queue";
import {
  civilDateInTimezone,
  DEFAULT_TENANT_TIMEZONE,
} from "@/lib/dashboard/tenant-timezone";
import { listTenantMembersForSelect } from "@/lib/crm/tenant-team-service";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "CRM · Follow-ups" };
export const dynamic = "force-dynamic";

export default async function CrmFollowUpsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const supabase = await createClient();
  const hoje = civilDateInTimezone(new Date(), DEFAULT_TENANT_TIMEZONE);

  const items: FollowUpItem[] = [];
  let warning: string | null = null;

  const tarefas = await supabase
    .from("cliente_tarefas" as never)
    .select("id, titulo, tipo, status, data_vencimento, cliente_id, responsavel_id")
    .eq("tenant_id", tenant.id)
    .is("deleted_at", null)
    .limit(300);

  if (tarefas.error) {
    warning = `Tarefas: ${tarefas.error.message}`;
  } else {
    const rows = (tarefas.data ?? []) as Array<Record<string, unknown>>;
    const clienteIds = [...new Set(rows.map((r) => String(r.cliente_id)))];
    const nomes = new Map<string, string>();
    if (clienteIds.length) {
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq("tenant_id", tenant.id)
        .in("id", clienteIds);
      for (const c of clientes ?? []) {
        nomes.set(c.id, c.nome);
      }
    }
    for (const r of rows) {
      items.push({
        id: String(r.id),
        tipo: String(r.tipo ?? "tarefa"),
        titulo: String(r.titulo ?? "Follow-up"),
        clienteId: String(r.cliente_id),
        clienteNome: nomes.get(String(r.cliente_id)) ?? "Cliente",
        responsavelId: (r.responsavel_id as string | null) ?? null,
        dataRef: String(r.data_vencimento ?? "").slice(0, 10),
        status: String(r.status ?? "pendente"),
        origem: "tarefa",
      });
    }
  }

  const groups = groupPremiumFollowUps(items, hoje);
  let members: Array<{ id: string; nome: string }> = [];
  try {
    members = await listTenantMembersForSelect(tenant.id);
  } catch {
    members = [];
  }

  return (
    <div className="space-y-6" data-phase28="crm-follow-ups">
      <CrmEnterpriseNavigation tenantSlug={tenantSlug} active="crm/follow-ups" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Follow-ups</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fila Premium a partir de `cliente_tarefas` — concluir, adiar e atribuir.
        </p>
      </div>
      <FollowUpPremiumPanel
        tenantSlug={tenantSlug}
        groups={groups}
        members={members}
        warning={warning}
      />
    </div>
  );
}
