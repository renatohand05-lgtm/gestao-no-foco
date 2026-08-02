import { CrmEnterpriseNavigation } from "@/components/crm/crm-enterprise-navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CRM_KPI_CATALOG } from "@/lib/crm";
import { createCrmDashboardService } from "@/lib/crm/cliente-360-service";
import { createCrmOportunidadeService } from "@/lib/crm/enterprise/oportunidade-service";
import { createCrmLeadsInboxService } from "@/lib/crm/phase28/leads-service";
import { summarizeLeadInbox } from "@/lib/crm/phase28/leads-inbox";
import { formatCurrency, formatPercent } from "@/lib/format";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Indicadores CRM" };
export const dynamic = "force-dynamic";

export default async function CrmIndicadoresPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  let liveError: string | null = null;
  let leadsAtivos = 0;
  let valorPotencial = 0;
  let oppsAbertas = 0;
  let pipelineValor = 0;
  let ganhas = 0;
  let perdidas = 0;
  let taxaConversao: number | null = null;
  let ticketMedio: number | null = null;
  let tempoMedio: number | null = null;

  try {
    const [dash, leadsSvc, oppSvc] = await Promise.all([
      createCrmDashboardService(tenant.id),
      createCrmLeadsInboxService(tenant.id),
      createCrmOportunidadeService(tenant.id),
    ]);
    const [kpis, leadsRes, opps] = await Promise.all([
      dash.getKpis(30),
      leadsSvc.listLeads(),
      oppSvc.listAll(),
    ]);
    const leadSummary = summarizeLeadInbox(leadsRes.rows);
    leadsAtivos = leadSummary.ativos;
    valorPotencial = leadSummary.valorPotencial;
    const abertas = opps.filter((r) => r.status === "aberta");
    oppsAbertas = abertas.length;
    pipelineValor = abertas.reduce(
      (s, r) => s + (Number(r.valor_estimado) || 0),
      0,
    );
    ganhas = opps.filter((r) => r.status === "ganha").length;
    perdidas = opps.filter((r) => r.status === "perdida").length;
    taxaConversao = kpis.taxa_conversao ?? null;
    ticketMedio = kpis.ticket_medio ?? null;
    tempoMedio = kpis.tempo_medio_fechamento_dias ?? null;
  } catch (e) {
    liveError = e instanceof Error ? e.message : "Indicadores ao vivo indisponíveis";
  }

  return (
    <div className="space-y-6" data-phase28="crm-indicadores">
      <CrmEnterpriseNavigation
        tenantSlug={tenantSlug}
        active="crm/indicadores"
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Indicadores CRM
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Métricas ao vivo + catálogo com fontes canônicas.
        </p>
        {liveError ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            {liveError}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric title="Leads ativos" value={String(leadsAtivos)} />
        <Metric
          title="Valor potencial leads"
          value={formatCurrency(valorPotencial)}
        />
        <Metric title="Oportunidades abertas" value={String(oppsAbertas)} />
        <Metric
          title="Valor do pipeline"
          value={formatCurrency(pipelineValor)}
        />
        <Metric title="Ganhas" value={String(ganhas)} />
        <Metric title="Perdidas" value={String(perdidas)} />
        <Metric
          title="Taxa de conversão"
          value={
            taxaConversao == null ? "—" : formatPercent(taxaConversao)
          }
        />
        <Metric
          title="Ticket médio"
          value={ticketMedio == null ? "—" : formatCurrency(ticketMedio)}
        />
        <Metric
          title="Tempo médio fechamento"
          value={
            tempoMedio == null ? "—" : `${Math.round(tempoMedio)} dias`
          }
        />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Catálogo canônico</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {CRM_KPI_CATALOG.map((k) => (
            <Card key={k.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{k.name}</CardTitle>
                <CardDescription>{k.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">{k.unit}</Badge>
                  <Badge
                    variant={
                      k.availability === "available" ? "default" : "secondary"
                    }
                  >
                    {k.availability}
                  </Badge>
                </div>
                <p>
                  <span className="text-muted-foreground">Fórmula:</span>{" "}
                  {k.formula}
                </p>
                <p>
                  <span className="text-muted-foreground">Fonte:</span>{" "}
                  {k.source}
                </p>
                {k.unavailableReason ? (
                  <p className="text-amber-800 dark:text-amber-300">
                    {k.unavailableReason}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
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
