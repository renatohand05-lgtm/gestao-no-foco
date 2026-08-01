import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getIntelligenceHistoryAction,
  getIntelligenceSessionDetailAction,
} from "@/lib/intelligence/enterprise/actions";
import { requireIntelligencePagePermission } from "@/lib/intelligence/enterprise/page-auth";
import { gfType } from "@/lib/design-system/signature";
import { InteligenciaHistoryControls } from "@/components/intelligence/inteligencia-history-controls";

export const metadata = { title: "Histórico · Inteligência" };

export default async function HistoricoPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;
  let auth;
  try {
    auth = await requireIntelligencePagePermission(tenantSlug);
  } catch {
    redirect(`/${tenantSlug}/dashboard`);
  }

  const history = await getIntelligenceHistoryAction({
    tenantId: auth.tenant.id,
    userId: auth.profile.id,
  });

  const detail =
    sp.session && history.ready
      ? await getIntelligenceSessionDetailAction({
          tenantId: auth.tenant.id,
          userId: auth.profile.id,
          sessionId: sp.session,
        })
      : null;

  return (
    <div className="space-y-4 p-4 sm:p-6" data-intelligence-history-page="">
      <h1 className={gfType.pageTitle}>Histórico</h1>
      <p className={gfType.caption}>
        Modo Determinístico · persistência{" "}
        <span data-persistence-ready={history.ready ? "1" : "0"}>
          {history.ready ? "ativa" : "pendente"}
        </span>
      </p>
      {!history.ready ? (
        <div
          className="rounded-xl border border-[var(--gf-border-subtle)] p-4"
          data-persistence-pending=""
        >
          <p className={gfType.body}>{history.message}</p>
        </div>
      ) : history.sessions.length === 0 ? (
        <p className={gfType.body}>Nenhuma sessão persistida ainda.</p>
      ) : (
        <ul className="space-y-2 text-sm" data-intelligence-session-list="">
          {history.sessions.map((s) => (
            <li
              key={String(s.id)}
              className="rounded-lg border border-border p-3"
              data-intelligence-session=""
              data-session-id={String(s.id)}
              data-mode={String(s.mode)}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {String(s.title ?? "Sessão")} · {String(s.mode)} ·{" "}
                    {String(s.status)}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {String(s.created_at)} · provider {String(s.provider ?? "—")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/${tenantSlug}/inteligencia/historico?session=${String(s.id)}`}
                    className="text-xs text-[var(--brand-gold)] hover:underline"
                    data-reopen-session=""
                  >
                    Reabrir
                  </Link>
                  <InteligenciaHistoryControls
                    tenantId={auth.tenant.id}
                    sessionId={String(s.id)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {detail?.session ? (
        <section
          className="space-y-3 rounded-xl border border-[var(--gf-border-subtle)] p-4"
          data-session-detail=""
          data-session-id={String(detail.session.id)}
        >
          <h2 className={gfType.sectionTitle}>Conversa reaberta</h2>
          <p className={gfType.caption}>{detail.message}</p>
          <ul className="space-y-2" data-session-messages="">
            {detail.messages.map((m) => (
              <li
                key={String(m.id)}
                className="rounded-lg border border-border p-2 text-sm"
                data-message-role={String(m.role)}
              >
                <p className="text-xs text-[var(--text-secondary)]">
                  {String(m.role)} · {String(m.mode)} · confiança{" "}
                  {String(m.confidence_level ?? "n/d")}
                </p>
                <p>{String(m.content)}</p>
              </li>
            ))}
          </ul>
          {detail.evidence.length > 0 ? (
            <div data-session-evidence="">
              <p className={gfType.cardTitle}>
                Evidências ({detail.evidence.length})
              </p>
              <ul className="mt-1 space-y-1 text-xs">
                {detail.evidence.map((e) => (
                  <li key={String(e.id)}>
                    {String(e.metric ?? e.source)} · {String(e.value ?? "n/d")} ·{" "}
                    {e.deep_link ? (
                      <a
                        href={String(e.deep_link)}
                        className="text-[var(--brand-gold)]"
                      >
                        origem
                      </a>
                    ) : (
                      "sem link"
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
