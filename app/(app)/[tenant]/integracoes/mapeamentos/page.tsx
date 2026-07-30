import { MappingStudioClient } from "@/components/import-engine/mapping-studio-client";
import {
  ExecutiveHeader,
  ExecutivePage,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { listImportProfiles } from "@/lib/import-engine/intelligence/intelligence-actions";
import { FINANCE_IMPORT_ADAPTER } from "@/lib/import-engine/adapters/finance";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Data Mapping Studio" };

export default async function MappingStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ module?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;
  await requireTenant(tenantSlug);

  const moduleKey = sp.module?.trim() || FINANCE_IMPORT_ADAPTER.moduleKey;
  const profilesR = await listImportProfiles(tenantSlug, moduleKey);
  const profiles = profilesR.success ? profilesR.profiles : [];

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs
        items={[
          { label: "Integrações", href: `/${tenantSlug}/integracoes` },
          { label: "Mapping Studio" },
        ]}
      />
      <ExecutiveHeader
        title="Data Mapping Studio"
        description="Fluxo Arquivo → Coluna → Campo → Confiança → Status, com badges Alta/Média/Baixa e deteção visual de conflitos. Nenhuma importação ocorre nesta tela."
      />
      <MappingStudioClient
        tenantSlug={tenantSlug}
        initialModule={moduleKey}
        initialProfiles={profiles}
      />
    </ExecutivePage>
  );
}
