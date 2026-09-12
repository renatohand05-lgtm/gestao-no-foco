import { Plug, Upload } from "lucide-react";

import { ComingSoonPanel } from "@/components/pilot/coming-soon-panel";
import { VendasWebhookPanel } from "@/components/integracoes/vendas-webhook-panel";
import { PageHeader } from "@/components/ui/page-header";
import { siteConfig } from "@/config/site";
import { integrationsImportPath } from "@/lib/pilot/readiness";
import { requireIntegracoesAccess } from "@/lib/integracoes/page-auth";

export const metadata = {
  title: "Integrações",
  description: "Importação de arquivos e integrações externas",
};

/**
 * Sprint 34.5 — Hub mock substituído por landing honesta.
 * Importação real permanece em /integracoes/importar.
 * Webhook de vendas externas: real, via chave de API (ver abaixo).
 * Marketplace / ERPs específicos / scheduler externos: Em breve.
 */
export default async function IntegracoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireIntegracoesAccess(tenantSlug);
  const importHref = integrationsImportPath(tenantSlug);
  const webhookUrl = `${siteConfig.url}/api/webhooks/vendas`;

  return (
    <div className="space-y-6 p-4 sm:p-6" data-integration-hub="pilot">
      <PageHeader
        title="Integrações"
        description="Importe planilhas e arquivos, ou conecte qualquer sistema externo via webhook de vendas."
      />

      <ComingSoonPanel
        icon={Upload}
        title="Importação de arquivos disponível"
        description="Use a importação para trazer clientes, produtos, vendas e financeiro a partir de arquivos. Não há integrações externas ativas neste momento."
        primaryAction={{ label: "Ir para importação", href: importHref }}
        testId="integrations-import-cta"
      />

      <VendasWebhookPanel tenantSlug={tenantSlug} webhookUrl={webhookUrl} />

      <ComingSoonPanel
        icon={Plug}
        title="Conectores prontos (ERPs e marketplaces)"
        description="Omie, Conta Azul, Bling e demais conectores prontos (sem precisar programar nada) ainda não estão disponíveis. O webhook de vendas acima já permite conectar qualquer sistema que consiga fazer uma chamada HTTP."
        secondaryAction={{
          label: "Voltar ao dashboard",
          href: `/${tenantSlug}/dashboard`,
        }}
        testId="integrations-external-coming-soon"
      />
    </div>
  );
}
