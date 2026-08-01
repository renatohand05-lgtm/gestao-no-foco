import { redirect } from "next/navigation";

import { getIntelligenceAuditAction } from "@/lib/intelligence/enterprise/actions";
import { requireIntelligencePagePermission } from "@/lib/intelligence/enterprise/page-auth";
import { gfType } from "@/lib/design-system/signature";

export const metadata = { title: "Auditoria · Inteligência" };

export default async function AuditoriaPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  let auth;
  try {
    auth = await requireIntelligencePagePermission(
      tenantSlug,
      "inteligencia.ver_auditoria",
    );
  } catch {
    try {
      auth = await requireIntelligencePagePermission(tenantSlug);
    } catch {
      redirect(`/${tenantSlug}/dashboard`);
    }
  }

  const audit = await getIntelligenceAuditAction(auth.tenant.id);

  return (
    <div className="space-y-4 p-4 sm:p-6" data-intelligence-audit-page="">
      <h1 className={gfType.pageTitle}>Auditoria de Inteligência</h1>
      <p className={gfType.caption}>
        Sem secrets · correlationId rastreável · modo explícito · sem memória
        fingindo persistência
      </p>
      {!audit.ready ? (
        <div
          className="rounded-xl border border-[var(--gf-border-subtle)] p-4"
          data-persistence-pending=""
        >
          <p className={gfType.body}>{audit.message}</p>
          <p className={gfType.caption}>
            Aplique manualmente{" "}
            <code>supabase/migrations/20260816_intelligence_persistence_phase27_6_1.sql</code>
            .
          </p>
        </div>
      ) : audit.rows.length === 0 ? (
        <p className={gfType.body}>Nenhum evento persistido.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {audit.rows.map((r) => (
            <li
              key={String(r.id)}
              className="rounded-lg border border-border p-3"
              data-intelligence-audit-row=""
            >
              <p className="font-medium">
                {String(r.event_type)} · {String(r.intent)} · {String(r.mode)} ·{" "}
                {String(r.status)}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {String(r.created_at)} · {String(r.correlation_id)} ·{" "}
                {String(r.provider)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
