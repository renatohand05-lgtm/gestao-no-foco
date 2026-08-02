import Link from "next/link";

import { CrmEnterpriseNavigation } from "@/components/crm/crm-enterprise-navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  groupFollowUps,
  type FollowUpItem,
} from "@/lib/crm/phase28/follow-up-queue";
import {
  civilDateInTimezone,
  DEFAULT_TENANT_TIMEZONE,
} from "@/lib/dashboard/tenant-timezone";
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

  const groups = groupFollowUps(items, hoje);

  return (
    <div className="space-y-6" data-phase28="crm-follow-ups">
      <CrmEnterpriseNavigation tenantSlug={tenantSlug} active="crm/follow-ups" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Follow-ups</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fila a partir de `cliente_tarefas` · WhatsApp/e-mail = aguardando
          integração.
        </p>
        {warning ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            {warning}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bucket
          title="Vencidos"
          items={groups.vencidos}
          tenantSlug={tenantSlug}
          tone="danger"
        />
        <Bucket
          title="Hoje"
          items={groups.hoje}
          tenantSlug={tenantSlug}
          tone="warning"
        />
        <Bucket
          title="Próximos 7 dias"
          items={groups.proximos_7}
          tenantSlug={tenantSlug}
          tone="info"
        />
        <Bucket
          title="Sem data / retorno"
          items={groups.sem_retorno}
          tenantSlug={tenantSlug}
          tone="neutral"
        />
      </div>
    </div>
  );
}

function Bucket({
  title,
  items,
  tenantSlug,
  tone,
}: {
  title: string;
  items: FollowUpItem[];
  tenantSlug: string;
  tone: "danger" | "warning" | "info" | "neutral";
}) {
  return (
    <Card data-tone={tone}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {title}{" "}
          <span className="text-muted-foreground">({items.length})</span>
        </CardTitle>
        <CardDescription>Ações pendentes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item.</p>
        ) : (
          items.slice(0, 12).map((item) => (
            <div
              key={`${item.origem}-${item.id}`}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <div className="font-medium">{item.titulo}</div>
              <div className="text-muted-foreground">
                {item.tipo} · {item.dataRef || "sem data"}
              </div>
              <Link
                href={`/${tenantSlug}/clientes/${item.clienteId}`}
                className="text-xs text-primary hover:underline"
              >
                {item.clienteNome}
              </Link>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
