import { redirect } from "next/navigation";

import { InteligenciaCopilotClient } from "@/components/intelligence/inteligencia-copilot-client";
import { requireIntelligencePagePermission } from "@/lib/intelligence/enterprise/page-auth";
import { gfType } from "@/lib/design-system/signature";

export const metadata = { title: "Copiloto Executivo" };

export default async function CopilotoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  let auth;
  try {
    auth = await requireIntelligencePagePermission(
      tenantSlug,
      "inteligencia.perguntar",
    );
  } catch {
    redirect(`/${tenantSlug}/inteligencia`);
  }

  return (
    <div
      className="space-y-4 p-4 sm:p-6"
      data-page-transition=""
      data-sprint="27.2"
      data-intelligence-copilot-page=""
    >
      <div>
        <h1 className={gfType.pageTitle}>Copiloto Executivo</h1>
        <p className={gfType.caption}>
          Perguntas com evidências · confiança explícita · provider transparente
        </p>
      </div>
      <InteligenciaCopilotClient
        tenantId={auth.tenant.id}
        tenantSlug={tenantSlug}
        userId={auth.profile.id}
        permissions={auth.permissions}
      />
    </div>
  );
}
