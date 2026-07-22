import Link from "next/link";

import { ModuleHeader } from "@/components/layout/module-header";
import { RecursosManager } from "@/components/operacoes/recursos-manager";
import { SectionCard } from "@/components/ui/section-card";
import { createRecursosOcupacaoService } from "@/lib/operacoes/recursos-service";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Ocupação da oficina" };

export default async function RecursosOcupacaoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  let canView =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["centro_operacoes.visualizar"] ??
    true;
  try {
    const perms = await createPermissionService(tenant.id, tenant.role);
    canView = await perms.has("centro_operacoes.visualizar");
  } catch {
    /* ok */
  }

  if (!canView) {
    return <p className="text-sm text-muted-foreground">Sem permissão.</p>;
  }

  const service = await createRecursosOcupacaoService(tenant.id);
  const data = await service.getData();
  const supabase = await createClient();
  const { data: centros } = await supabase
    .from("centros_custo")
    .select("id, nome")
    .eq("tenant_id", tenant.id)
    .eq("ativo", true)
    .is("deleted_at", null)
    .order("nome")
    .limit(100);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Elevadores e recursos"
        description="Cadastre e gerencie elevadores, rampas, boxes e equipamentos"
        breadcrumbs={[
          {
            label: "Centro de Operações",
            href: `/${tenantSlug}/centro-operacoes`,
          },
          { label: "Recursos" },
        ]}
      >
        <Link
          href={`/${tenantSlug}/centro-operacoes`}
          className="text-sm underline"
        >
          Voltar
        </Link>
      </ModuleHeader>

      {data.migrationPending ? (
        <SectionCard title="Migration pendente">
          <p className="text-sm text-muted-foreground">
            Aplique{" "}
            <code className="text-xs">20260801_sprint15_centro_operacoes.sql</code>{" "}
            e{" "}
            <code className="text-xs">20260802_gate2_recursos_alertas.sql</code>{" "}
            no Supabase.
          </p>
        </SectionCard>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Taxa de ocupação</p>
              <p className="text-2xl font-semibold tabular-nums">
                {data.kpis.taxaOcupacao}%
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Disponíveis</p>
              <p className="text-2xl font-semibold tabular-nums">
                {data.kpis.disponivel}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Ocupados</p>
              <p className="text-2xl font-semibold tabular-nums">
                {data.kpis.ocupado}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Em manutenção</p>
              <p className="text-2xl font-semibold tabular-nums">
                {data.kpis.manutencao}
              </p>
            </div>
          </div>

          <SectionCard title="Gestão de recursos">
            <RecursosManager
              tenantSlug={tenantSlug}
              recursos={data.recursos}
              centros={(centros ?? []).map((c) => ({
                id: c.id,
                nome: c.nome,
              }))}
            />
          </SectionCard>

          <p className="text-xs text-muted-foreground">
            Status possíveis: Disponível · Ocupado · Reservado · Manutenção ·
            Bloqueado
          </p>
        </>
      )}
    </div>
  );
}
