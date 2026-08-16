import { CentroOpsKpiCards } from "@/components/operacoes/centro-ops-kpi-cards";
import { CentroOpsLivePanel } from "@/components/operacoes/centro-ops-live-panel";
import { DashboardPrefsEditor } from "@/components/operacoes/dashboard-prefs-editor";
import { SectionCard } from "@/components/ui/section-card";
import { getCurrentProfile } from "@/lib/auth/session";
import { createCentroOperacoesService } from "@/lib/operacoes/centro-operacoes-service";
import { createDashboardPreferenciasService } from "@/lib/operacoes/dashboard-prefs-service";
import type { DashboardPreferencia } from "@/lib/operacoes/dashboard-prefs-service";
import { getOpsCenterCopy } from "@/config/segment-labels";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { tryResolvePermissions } from "@/lib/permissoes/authorization";
import { createCustomerReturnService } from "@/lib/retention/return-service";
import { retentionOpsSummary } from "@/lib/retention/kpis";
import {
  civilDateInTimezone,
  DEFAULT_TENANT_TIMEZONE,
} from "@/lib/dashboard/tenant-timezone";
import { requireTenant } from "@/lib/tenants";
import {
  ExecutiveHeader,
  ExecutivePage,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = { title: "Centro de Operações" };

const DEFAULT_PREFS: DashboardPreferencia = {
  modo: "normal",
  cardsVisiveis: [],
  layout: { order: [] },
  fullscreenDefault: false,
};

export default async function CentroOperacoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const copy = getOpsCenterCopy(tenant.segment, {
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });

  // Sprint 30.1 — paralelizar authz + perfil (antes eram sequenciais com getData).
  const [profile, centroPerms] = await Promise.all([
    getCurrentProfile(),
    tryResolvePermissions(tenant.id, tenant.role, [
      "centro_operacoes.visualizar",
      "centro_operacoes.alterar_status",
      "centro_operacoes.ver_alertas",
      "dashboard.personalizar",
    ]),
  ]);

  const canView =
    centroPerms["centro_operacoes.visualizar"] ??
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["centro_operacoes.visualizar"] ??
    true;
  const canAlterar =
    centroPerms["centro_operacoes.alterar_status"] ??
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["centro_operacoes.alterar_status"] ??
    false;
  const canAlertas =
    centroPerms["centro_operacoes.ver_alertas"] ??
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["centro_operacoes.ver_alertas"] ??
    true;
  const canPersonalizar =
    centroPerms["dashboard.personalizar"] ??
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["dashboard.personalizar"] ??
    false;

  if (!canView) {
    return (
      <ExecutivePage width="wide" spacing="default">
        <Breadcrumbs items={[{ label: "Centro de Operações" }]} />
        <ExecutiveHeader title="Centro de Operações" />
        <p className="text-sm text-muted-foreground">
          Sem permissão para visualizar o Centro de Operações.
        </p>
      </ExecutivePage>
    );
  }

  const service = await createCentroOperacoesService(tenant.id);

  // Prefs + dados em paralelo (prefs não bloqueia o fetch principal).
  const [data, prefs, retentionRows] = await Promise.all([
    service.getData(tenantSlug, {
      segment: tenant.segment,
      segmentVersion: tenant.segment_version,
      segmentConfig: tenant.segment_config,
    }),
    profile?.id
      ? createDashboardPreferenciasService(tenant.id, profile.id)
          .then((prefService) => prefService.get("centro_operacoes"))
          .catch(() => DEFAULT_PREFS)
      : Promise.resolve(DEFAULT_PREFS),
    createCustomerReturnService(tenant.id)
      .then((s) => s.list())
      .catch(() => []),
  ]);
  const today = civilDateInTimezone(new Date(), DEFAULT_TENANT_TIMEZONE);
  const retention = retentionOpsSummary(retentionRows, today);
  const priorityReturns = retentionRows
    .filter((r) =>
      ["hoje", "atrasado", "cliente_respondeu_sim", "proximo"].includes(
        r.status,
      ),
    )
    .slice(0, 5);

  const order =
    (prefs.layout.order as string[] | undefined)?.length
      ? (prefs.layout.order as string[])
      : data.cards.map((c) => c.key);

  let cards = [...data.cards].sort((a, b) => {
    const ia = order.indexOf(a.key);
    const ib = order.indexOf(b.key);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });

  if (prefs.cardsVisiveis.length) {
    const set = new Set(prefs.cardsVisiveis);
    cards = cards.filter((c) => set.has(c.key));
  }

  if (prefs.modo === "executivo") {
    cards = cards.filter((c) =>
      ["carros", "abertas", "atrasadas", "execucao", "pronto", "aprovacao"].includes(
        c.key,
      ),
    );
  } else if (prefs.modo === "comercial") {
    cards = cards.filter((c) =>
      ["aprovacao", "pronto", "finalizadas_hoje", "retornos"].includes(c.key),
    );
  }

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[{ label: "Centro de Operações" }]} />
      <ExecutiveHeader
        title="Centro de Operações"
        description={copy.pageDescription}
        actions={
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {canAlertas ? (
                <a
                  href={`/${tenantSlug}/centro-operacoes/alertas`}
                  className="underline"
                >
                  Ver alertas
                </a>
              ) : null}
              <a href={`/${tenantSlug}/ordens/dashboard`} className="underline">
                Dashboard operacional
              </a>
              <a
                href={`/${tenantSlug}/centro-operacoes/recursos`}
                className="underline"
              >
                {copy.resourcesLinkLabel}
              </a>
            </div>
          </>
        }
      />

      <DashboardPrefsEditor
        tenantSlug={tenantSlug}
        dashboardTipo="centro_operacoes"
        allCards={data.cards.map((c) => ({ key: c.key, label: c.label }))}
        initial={prefs}
        canPersonalizar={canPersonalizar}
      />

      <CentroOpsKpiCards cards={cards} />

      <SectionCard
        title="Retornos e fidelização"
        description="Retorno previsto operacional (independente de OS/garantia). WhatsApp real desativado."
      >
        <div
          className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6"
          data-phase35="ops-retornos"
        >
          {[
            ["Hoje", retention.hoje],
            ["Próximos", retention.proximos7],
            ["Atrasados", retention.atrasados],
            ["Aguardando contato", retention.aguardandoContato],
            ["Cliente respondeu", retention.clienteRespondeu],
            ["Agendados", retention.agendados],
          ].map(([label, n]) => (
            <div key={String(label)} className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-xl font-semibold tabular-nums">{n}</div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium">Retornos prioritários</p>
          <ul className="mt-2 space-y-1 text-sm">
            {priorityReturns.length === 0 ? (
              <li className="text-muted-foreground">Nenhum retorno urgente.</li>
            ) : (
              priorityReturns.map((r) => (
                <li key={r.id}>
                  {r.due_at} · {r.motivo ?? "Retorno"} · {r.status}
                </li>
              ))
            )}
          </ul>
          <a
            className="mt-2 inline-block text-sm underline"
            href={`/${tenantSlug}/crm/retornos`}
          >
            Ver todos
          </a>
        </div>
      </SectionCard>

      <SectionCard
        title={copy.boardTitle}
        description={
          canAlterar
            ? copy.boardDescriptionCanEdit
            : copy.boardDescriptionReadOnly
        }
      >
        <CentroOpsLivePanel
          tenantSlug={tenantSlug}
          board={data.board}
          canAlterarStatus={canAlterar}
          syncedAt={data.syncedAt}
          pollSeconds={60}
          showVehicleFields={copy.showVehicleFields}
          assigneeLabel={copy.assigneeLabel}
          boardColumnLabels={copy.boardColumnLabels}
        />
      </SectionCard>
    </ExecutivePage>
  );
}
