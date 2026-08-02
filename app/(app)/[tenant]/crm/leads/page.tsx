import Link from "next/link";

import { ConvertLeadButton } from "@/components/crm/convert-lead-button";
import { CrmEnterpriseNavigation } from "@/components/crm/crm-enterprise-navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createCrmLeadsInboxService } from "@/lib/crm/phase28/leads-service";
import {
  filterLeadInbox,
  labelOrigemCrm,
  labelPrioridadeCrm,
  summarizeLeadInbox,
} from "@/lib/crm/phase28/leads-inbox";
import { formatCurrency } from "@/lib/format";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "CRM · Leads" };
export const dynamic = "force-dynamic";

export default async function CrmLeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createCrmLeadsInboxService(tenant.id);
  const { rows, schemaReady } = await service.listLeads();
  const filtered = filterLeadInbox(rows, { q: sp.q });
  const summary = summarizeLeadInbox(filtered);

  return (
    <div className="space-y-6" data-phase28="crm-leads">
      <CrmEnterpriseNavigation tenantSlug={tenantSlug} active="crm/leads" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inbox sobre a base única de clientes (estágio Lead). Sem tabela
          paralela.
        </p>
        {!schemaReady ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            Campos avançados (prioridade, valor potencial) aguardam migration
            Fase 28.1.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric title="Leads ativos" value={String(summary.ativos)} />
        <Metric
          title="Valor potencial"
          value={formatCurrency(summary.valorPotencial)}
        />
        <Metric
          title="Sem próxima ação"
          value={String(summary.semProximaAcao)}
        />
        <Metric
          title="Alta prioridade"
          value={String(summary.altaPrioridade)}
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum lead</CardTitle>
            <CardDescription>
              Cadastre um cliente no estágio Lead ou mova no Kanban.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={`/${tenantSlug}/clientes/novo`}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Novo cliente / lead
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Empresa</th>
                <th className="px-3 py-2">Contato</th>
                <th className="px-3 py-2">Origem</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Potencial</th>
                <th className="px-3 py-2">Próxima ação</th>
                <th className="px-3 py-2">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link
                      href={`/${tenantSlug}/clientes/${lead.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {lead.nome}
                    </Link>
                    {lead.prioridade ? (
                      <Badge variant="outline" className="ml-2">
                        {labelPrioridadeCrm(lead.prioridade)}
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{lead.empresa ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div>{lead.telefone ?? "—"}</div>
                    <div className="text-muted-foreground">{lead.email ?? ""}</div>
                  </td>
                  <td className="px-3 py-2">{labelOrigemCrm(lead.origem)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {lead.score ?? "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {lead.valorPotencial != null
                      ? formatCurrency(lead.valorPotencial)
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div>{lead.proximaAcao ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {lead.dataProximaAcao ?? ""}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <ConvertLeadButton
                      tenantSlug={tenantSlug}
                      clienteId={lead.id}
                      clienteNome={lead.nome}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
