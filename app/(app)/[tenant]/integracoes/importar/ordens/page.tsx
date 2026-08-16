import { notFound } from "next/navigation";

import { ExecutiveHeader, ExecutivePage } from "@/components/executive";
import { OsImportWizardClient } from "@/components/import-engine/os-import-wizard-client";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SERVICE_ORDERS_IMPORT_ADAPTER } from "@/lib/import-engine/adapters/service-orders/adapter";
import { listOsImportHistory } from "@/lib/import-engine/adapters/service-orders/os-import-actions";
import { canAccessModuleImport } from "@/lib/import-engine/adapters/shared/require-import-access";
import { getSegmentUiCopy } from "@/lib/segments/copy.ts";
import {
  hasCapability,
  resolveSegmentContext,
} from "@/lib/segments/resolve.ts";
import { requireTenant } from "@/lib/tenants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const ui = getSegmentUiCopy({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });
  return { title: `Importar ${ui.importModuleTitle}` };
}

export default async function ImportarOrdensPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const ctx = resolveSegmentContext({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });
  if (!hasCapability(ctx, "work_orders")) notFound();
  const ui = getSegmentUiCopy(ctx);

  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: "Integrações", href: `/${tenantSlug}/integracoes` },
        { label: "Importar Arquivos", href: `/${tenantSlug}/integracoes/importar` },
        { label: ui.importModuleTitle },
      ]}
    />
  );

  if (!canAccessModuleImport(tenant)) {
    return (
      <ExecutivePage width="wide" spacing="loose">
        {breadcrumbs}
        <ExecutiveHeader
          title={`Importar ${ui.importModuleTitle}`}
          description={ui.importModuleDescription}
        />
        <p
          className="rounded-lg border border-amber-600/40 px-3 py-3 text-sm"
          role="alert"
          data-import-rbac="denied"
        >
          Sem permissão para importar dados ({SERVICE_ORDERS_IMPORT_ADAPTER.requiredPermission}).
        </p>
      </ExecutivePage>
    );
  }

  const historyR = await listOsImportHistory(tenantSlug);
  const history = historyR.success ? historyR.history : [];

  return (
    <ExecutivePage width="wide" spacing="loose">
      {breadcrumbs}
      <ExecutiveHeader
        title={`Importar ${ui.importModuleTitle}`}
        description={ui.importModuleDescription}
      />
      <OsImportWizardClient
        tenantSlug={tenantSlug}
        initialHistory={history}
        copy={{
          uploadTitle: ui.importUploadTitle,
          uploadHint: ui.importUploadHint,
          reviewDescription: ui.importReviewDescription,
          historyDescription: ui.importHistoryDescription,
        }}
      />
    </ExecutivePage>
  );
}
