import { CentroOpsKpiCards } from "@/components/operacoes/centro-ops-kpi-cards";
import { CentroOpsLivePanel } from "@/components/operacoes/centro-ops-live-panel";
import { DashboardPrefsEditor } from "@/components/operacoes/dashboard-prefs-editor";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { getCurrentProfile } from "@/lib/auth/session";
import { createCentroOperacoesService } from "@/lib/operacoes/centro-operacoes-service";
import { createDashboardPreferenciasService } from "@/lib/operacoes/dashboard-prefs-service";
import type { DashboardPreferencia } from "@/lib/operacoes/dashboard-prefs-service";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Centro de Operações" };

export default async function CentroOperacoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();

  let canView =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["centro_operacoes.visualizar"] ??
    true;
  let canAlterar =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["centro_operacoes.alterar_status"] ??
    false;
  let canAlertas =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["centro_operacoes.ver_alertas"] ??
    true;
  let canPersonalizar =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["dashboard.personalizar"] ?? false;

  try {
    const perms = await createPermissionService(tenant.id, tenant.role);
    canView = await perms.has("centro_operacoes.visualizar");
    canAlterar = await perms.has("centro_operacoes.alterar_status");
    canAlertas = await perms.has("centro_operacoes.ver_alertas");
    canPersonalizar = await perms.has("dashboard.personalizar");
  } catch {
    /* fallback */
  }

  if (!canView) {
    return (
      <div className="space-y-4">
        <ModuleHeader
          title="Centro de Operações"
          breadcrumbs={[{ label: "Centro de Operações" }]}
        />
        <p className="text-sm text-muted-foreground">
          Sem permissão para visualizar o Centro de Operações.
        </p>
      </div>
    );
  }

  const service = await createCentroOperacoesService(tenant.id);
  const data = await service.getData(tenantSlug);

  let prefs: DashboardPreferencia = {
    modo: "normal",
    cardsVisiveis: [],
    layout: { order: [] },
    fullscreenDefault: false,
  };
  if (profile?.id) {
    try {
      const prefService = await createDashboardPreferenciasService(
        tenant.id,
        profile.id,
      );
      prefs = await prefService.get("centro_operacoes");
    } catch {
      /* ok */
    }
  }

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
    <div className="space-y-6">
      <ModuleHeader
        title="Centro de Operações"
        description="Visão rápida do que está acontecendo na oficina agora"
        breadcrumbs={[{ label: "Centro de Operações" }]}
      >
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
            Dashboard de OS
          </a>
          <a
            href={`/${tenantSlug}/centro-operacoes/recursos`}
            className="underline"
          >
            Elevadores / recursos
          </a>
        </div>
      </ModuleHeader>

      <DashboardPrefsEditor
        tenantSlug={tenantSlug}
        dashboardTipo="centro_operacoes"
        allCards={data.cards.map((c) => ({ key: c.key, label: c.label }))}
        initial={prefs}
        canPersonalizar={canPersonalizar}
      />

      <CentroOpsKpiCards cards={cards} />

      <SectionCard
        title="Quadro da operação"
        description={
          canAlterar
            ? "Arraste os cartões entre etapas quando a regra permitir. Clique para abrir a OS."
            : "Clique no cartão para abrir a OS. Sem permissão para alterar status pelo quadro."
        }
      >
        <CentroOpsLivePanel
          tenantSlug={tenantSlug}
          board={data.board}
          canAlterarStatus={canAlterar}
          syncedAt={data.syncedAt}
          pollSeconds={60}
        />
      </SectionCard>
    </div>
  );
}
