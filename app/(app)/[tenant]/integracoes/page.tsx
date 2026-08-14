import { Plug, Upload } from "lucide-react";

import { ComingSoonPanel } from "@/components/pilot/coming-soon-panel";
import { PageHeader } from "@/components/ui/page-header";
import { integrationsImportPath } from "@/lib/pilot/readiness";
import { requireIntegracoesAccess } from "@/lib/integracoes/page-auth";

export const metadata = {
  title: "Integrações",
  description: "Importação de arquivos e integrações externas",
};

/**
 * Sprint 34.5 — Hub mock substituído por landing honesta.
 * Importação real permanece em /integracoes/importar.
 * Marketplace / webhooks / scheduler externos: Em breve.
 */
export default async function IntegracoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireIntegracoesAccess(tenantSlug);
  const importHref = integrationsImportPath(tenantSlug);

  return (
    <div className="space-y-6 p-4 sm:p-6" data-integration-hub="pilot">
      <PageHeader
        title="Integrações"
        description="Importe planilhas e arquivos agora. Conexões externas com ERPs e marketplaces chegam em breve."
      />

      <ComingSoonPanel
        icon={Upload}
        title="Importação de arquivos disponível"
        description="Use a importação para trazer clientes, produtos, vendas e financeiro a partir de arquivos. Não há integrações externas ativas neste momento."
        primaryAction={{ label: "Ir para importação", href: importHref }}
        testId="integrations-import-cta"
      />

      <ComingSoonPanel
        icon={Plug}
        title="Conexões externas"
        description="Omie, Conta Azul, Bling e demais conectores ainda não estão disponíveis para configuração. Quando forem liberados, aparecerão aqui com status claro (Em breve / Disponível / Ativa)."
        secondaryAction={{
          label: "Voltar ao dashboard",
          href: `/${tenantSlug}/dashboard`,
        }}
        testId="integrations-external-coming-soon"
      />
    </div>
  );
}
