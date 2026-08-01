import { redirect } from "next/navigation";

import { GFProviderStatus } from "@/components/intelligence/gf-provider-status";
import { requireIntelligencePagePermission } from "@/lib/intelligence/enterprise/page-auth";
import { getIntelligenceConfigAction } from "@/lib/intelligence/enterprise/actions";
import { gfType } from "@/lib/design-system/signature";

export const metadata = { title: "Configurações · Inteligência" };

export default async function ConfigPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  try {
    await requireIntelligencePagePermission(tenantSlug);
  } catch {
    redirect(`/${tenantSlug}/dashboard`);
  }

  const config = await getIntelligenceConfigAction();

  return (
    <div className="space-y-4 p-4 sm:p-6" data-intelligence-config-page="">
      <h1 className={gfType.pageTitle}>Configurações de Inteligência</h1>
      <p className={gfType.caption}>
        Providers externos permanecem OFF por padrão. Nenhuma chave no cliente.
      </p>

      <section
        className="space-y-2 rounded-xl border border-[var(--gf-border-subtle)] p-4"
        data-deterministic-mode-panel=""
      >
        <p className={gfType.sectionTitle}>Modo: {config.modeLabel}</p>
        <p className={gfType.body}>{config.modeDescription}</p>
        <p className={gfType.caption}>{config.externalProviderLabel}</p>
        {!config.providerExternalConfigured ? (
          <GFProviderStatus mode="unavailable" label="external: OFF" />
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        {config.health.map((h) => (
          <GFProviderStatus
            key={h.providerId}
            mode={h.mode}
            label={`${h.providerId}: ${h.message}`}
          />
        ))}
      </div>

      <section
        className="rounded-xl border border-[var(--gf-border-subtle)] p-4"
        data-persistence-status=""
        data-ready={config.persistence.ready ? "1" : "0"}
      >
        <p className={gfType.sectionTitle}>Persistência</p>
        <p className={gfType.body}>{config.persistence.message}</p>
        {!config.persistence.ready ? (
          <p className={gfType.caption} data-persistence-pending="">
            MIGRATION PENDENTE DE APLICAÇÃO MANUAL —
            20260816_intelligence_persistence_phase27_6_1.sql
          </p>
        ) : null}
      </section>

      <pre className="overflow-auto rounded-xl border border-border bg-card p-3 text-xs">
        {JSON.stringify(
          {
            flags: config.flags,
            persistence: config.persistence,
            providerExternalConfigured: config.providerExternalConfigured,
          },
          null,
          2,
        )}
      </pre>
    </div>
  );
}
