import Link from "next/link";

import {
  ExecutiveEmptyState,
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { IntelligenceDrilldown } from "@/components/import-engine/intelligence-drilldown";
import { IntelligenceHubNav } from "@/components/import-engine/intelligence-hub-nav";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { listImportRuns } from "@/lib/import-engine/intelligence/intelligence-actions";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Auditoria de Importações" };

export default async function AuditoriaImportacoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  const runsR = await listImportRuns(tenantSlug, { limit: 20, offset: 0 });
  const runs = runsR.success ? runsR.items : [];

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs
        items={[
          { label: "Integrações", href: `/${tenantSlug}/integracoes` },
          { label: "Auditoria" },
        ]}
      />
      <ExecutiveHeader
        title="Auditoria de Importações"
        description="Trilha estrutural de importações — dados reais do histórico quando disponíveis."
      />
      <IntelligenceHubNav tenantSlug={tenantSlug} />

      <ExecutiveSection
        title="Trilha de auditoria"
        description="Navegue do indicador até o lançamento via drill-down."
        panel
      >
        {runs.length === 0 ? (
          <ExecutiveEmptyState
            title="Sem eventos de auditoria"
            description="Conclua importações para ver trilhas de auditoria reais no histórico."
            action={{
              label: "Ver histórico",
              href: `/${tenantSlug}/integracoes/historico`,
            }}
          />
        ) : (
          <ul className="space-y-3">
            {runs.map((run) => (
              <li
                key={run.id}
                className="rounded-lg border border-border/60 bg-card/30 p-3"
                data-audit-run={run.id}
              >
                <IntelligenceDrilldown
                  path={{
                    tenantSlug,
                    nodes: [
                      {
                        level: "import",
                        id: run.id,
                        label: run.fileName,
                        meta: run.status,
                      },
                      {
                        level: "audit",
                        id: run.id,
                        label: run.createdAt.slice(0, 10),
                      },
                    ],
                  }}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {run.userLabel} · {run.importedRows}/{run.totalRows} linhas ·{" "}
                  {run.errorCount} erro(s)
                  {run.errorsSample.length > 0 ? (
                    <>
                      {" "}
                      — amostra:{" "}
                      <span className="text-foreground">{run.errorsSample[0]}</span>
                    </>
                  ) : null}
                </p>
                <Link
                  href={`/${tenantSlug}/integracoes/historico`}
                  className="mt-1 inline-block text-xs underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Detalhes no histórico
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ExecutiveSection>
    </ExecutivePage>
  );
}
