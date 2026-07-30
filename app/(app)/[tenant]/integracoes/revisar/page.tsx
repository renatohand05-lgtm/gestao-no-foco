import Link from "next/link";
import { ListChecks } from "lucide-react";

import { AssistedReviewQueueClient } from "@/components/import-engine/assisted-review-queue-client";
import { IntelligenceHubNav } from "@/components/import-engine/intelligence-hub-nav";
import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listImportRuns } from "@/lib/import-engine/intelligence/intelligence-actions";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Revisão assistida" };

export default async function RevisarImportacoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  const runsR = await listImportRuns(tenantSlug, { limit: 20, offset: 0 });
  const runs = runsR.success ? runsR.items : [];
  const partialOrFailed = runs.filter(
    (r) => r.status === "partial" || r.status === "failed",
  );

  // Fila de linhas de baixa confiança exige sessão de wizard ativa.
  // Não inventamos itens — empty state honesto + atalho para importar.
  const queue: never[] = [];

  return (
    <ExecutivePage>
      <Breadcrumbs
        items={[
          { label: "Integrações", href: `/${tenantSlug}/integracoes` },
          { label: "Revisar" },
        ]}
      />
      <ExecutiveHeader
        title="Revisão assistida"
        description="Confirme, edite ou ignore sugestões com explicação e confiança. Sem confirmação silenciosa de baixa confiança."
      />
      <IntelligenceHubNav tenantSlug={tenantSlug} />

      {partialOrFailed.length > 0 ? (
        <ExecutiveSection title="Runs que pedem atenção">
          <ul className="space-y-2 text-sm">
            {partialOrFailed.slice(0, 5).map((r) => (
              <li key={r.id} className="rounded-md border border-border/60 px-3 py-2">
                <span className="font-medium">{r.fileName}</span>
                <span className="text-muted-foreground">
                  {" "}
                  — status {r.status} · {r.module}
                </span>
              </li>
            ))}
          </ul>
          <Button render={<Link href={`/${tenantSlug}/integracoes/historico`} />} variant="outline" size="sm" className="mt-3">
            Abrir histórico
          </Button>
        </ExecutiveSection>
      ) : null}

      <ExecutiveSection title="Fila de revisão">
        {queue.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Nenhuma linha pendente nesta sessão"
            description="A revisão linha a linha abre a partir do assistente de importação (após classificar). Não há fila persistida inventada aqui."
            action={{
              label: "Ir para Importar",
              href: `/${tenantSlug}/integracoes/importar`,
            }}
          />
        ) : (
          <AssistedReviewQueueClient initialItems={queue} />
        )}
      </ExecutiveSection>
    </ExecutivePage>
  );
}
