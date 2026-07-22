import Link from "next/link";

import { OsTable } from "@/components/ordens/os-table";
import { OsSubnav } from "@/components/ordens/os-subnav";
import { ModuleHeader } from "@/components/layout/module-header";
import { buttonVariants } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { createOrdemServicoService } from "@/lib/ordens/ordem-servico-service";
import { OS_STATUS, OS_STATUS_LABELS } from "@/lib/ordens/os-status";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { cn } from "@/lib/utils";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Ordens de Serviço" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    status?: string;
    q?: string;
    de?: string;
    ate?: string;
    mecanico_id?: string;
    consultor_id?: string;
    cliente_id?: string;
    veiculo_id?: string;
    centro_custo_id?: string;
    incluir_arquivadas?: string;
  }>;
};

export default async function OrdensPage({ params, searchParams }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createOrdemServicoService(tenant.id);
  const { items } = await service.list({
    status: sp.status || "all",
    q: sp.q,
    de: sp.de,
    ate: sp.ate,
    mecanico_id: sp.mecanico_id,
    consultor_id: sp.consultor_id,
    cliente_id: sp.cliente_id,
    veiculo_id: sp.veiculo_id,
    centro_custo_id: sp.centro_custo_id,
    incluir_arquivadas: sp.incluir_arquivadas === "1",
    perPage: 50,
  });

  let canCancel = DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.cancelar"];
  let canArquivar = DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.arquivar"];
  let canExcluirRascunho =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.excluir_rascunho"];
  let canRestaurar = DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.restaurar"];
  try {
    const perms = await createPermissionService(tenant.id, tenant.role);
    canCancel = await perms.has("os.cancelar");
    canArquivar = await perms.has("os.arquivar");
    canExcluirRascunho = await perms.has("os.excluir_rascunho");
    canRestaurar = await perms.has("os.restaurar");
  } catch {
    /* ok */
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Ordens de Serviço"
        description={`Oficina enterprise · ${tenant.name}`}
        breadcrumbs={[{ label: "Ordens" }]}
      >
        <OsSubnav tenantSlug={tenantSlug} active="lista" />
      </ModuleHeader>

      <SectionCard title="Filtros" contentClassName="pt-0">
        <form className="flex flex-wrap gap-2">
          <select
            name="status"
            defaultValue={sp.status ?? "all"}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="all">Todos os status</option>
            {OS_STATUS.map((s) => (
              <option key={s} value={s}>
                {OS_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Buscar nº, cliente, placa…"
            className="h-9 min-w-56 rounded-md border border-input bg-transparent px-3 text-sm"
          />
          <input
            type="date"
            name="de"
            defaultValue={sp.de ?? ""}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          />
          <input
            type="date"
            name="ate"
            defaultValue={sp.ate ?? ""}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="incluir_arquivadas"
              value="1"
              defaultChecked={sp.incluir_arquivadas === "1"}
            />
            Incluir arquivadas
          </label>
          <button type="submit" className={cn(buttonVariants({ size: "sm" }))}>
            Filtrar
          </button>
          {sp.de || sp.ate || sp.status ? (
            <Link
              href={`/${tenantSlug}/ordens`}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Limpar
            </Link>
          ) : null}
        </form>
      </SectionCard>

      <SectionCard title="Listagem" contentClassName="pt-0">
        <OsTable
          tenantSlug={tenantSlug}
          items={items}
          canCancel={canCancel}
          canArquivar={canArquivar}
          canExcluirRascunho={canExcluirRascunho}
          canRestaurar={canRestaurar}
        />
      </SectionCard>
    </div>
  );
}
