import Link from "next/link";

import { OsTable } from "@/components/ordens/os-table";
import { ModuleHeader } from "@/components/layout/module-header";
import { buttonVariants } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { createOrdemServicoService } from "@/lib/ordens/ordem-servico-service";
import { OS_STATUS, OS_STATUS_LABELS } from "@/lib/ordens/os-status";
import { cn } from "@/lib/utils";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Ordens de Serviço" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ status?: string; q?: string }>;
};

export default async function OrdensPage({ params, searchParams }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const { status, q } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createOrdemServicoService(tenant.id);
  const { items } = await service.list({
    status: status || "all",
    q,
    perPage: 50,
  });

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Ordens de Serviço"
        description={`Oficina enterprise · ${tenant.name}`}
        breadcrumbs={[{ label: "Ordens" }]}
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${tenantSlug}/ordens/nova`}
            className={cn(buttonVariants())}
          >
            Nova OS
          </Link>
          <Link
            href={`/${tenantSlug}/ordens/qualidade-operacional`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Qualidade
          </Link>
        </div>
      </ModuleHeader>

      <SectionCard title="Filtros" contentClassName="pt-0">
        <form className="flex flex-wrap gap-2">
          <select
            name="status"
            defaultValue={status ?? "all"}
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
            defaultValue={q ?? ""}
            placeholder="Buscar nº, cliente, placa…"
            className="h-9 min-w-56 rounded-md border border-input bg-transparent px-3 text-sm"
          />
          <button type="submit" className={cn(buttonVariants({ size: "sm" }))}>
            Filtrar
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Listagem" contentClassName="pt-0">
        <OsTable tenantSlug={tenantSlug} items={items} />
      </SectionCard>
    </div>
  );
}
