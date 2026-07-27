import Link from "next/link";

import {
  ApprovalEmptyState,
  ApprovalRuntimeDashboard,
} from "@/components/approval";
import { ModuleHeader } from "@/components/layout/module-header";
import { listApprovalRuntimeAction } from "@/lib/approval/runtime/actions";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Aprovações — Runtime" };

type SearchParams = {
  page?: string;
  limit?: string;
  status?: string;
  priority?: string;
  requesterId?: string;
};

export default async function ApprovalRuntimePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;
  const tenant = await requireTenant(tenantSlug);

  const page = Math.max(1, Number(sp.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.limit) || 25));

  const result = await listApprovalRuntimeAction(tenantSlug, {
    page,
    limit,
    status: sp.status ?? null,
    priority: sp.priority ?? null,
    requesterId: sp.requesterId ?? null,
  });

  if (!result.success) {
    return (
      <div className="space-y-4">
        <ModuleHeader
          title="Runtime de Aprovações"
          description="Operação enterprise integrada"
          breadcrumbs={[
            { label: "Aprovações", href: `/${tenantSlug}/aprovacoes/runtime` },
            { label: "Runtime" },
          ]}
        />
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {result.error}
        </div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(result.total / result.limit));

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Runtime de Aprovações"
        description={`Tenant ${tenant.name} · ${result.total} registro(s)`}
        breadcrumbs={[
          { label: "Aprovações", href: `/${tenantSlug}/aprovacoes/runtime` },
          { label: "Runtime" },
        ]}
      />

      {result.items.length === 0 ? (
        <ApprovalEmptyState />
      ) : (
        <ApprovalRuntimeDashboard
          items={result.items}
          kpis={result.kpis}
          page={result.page}
          total={result.total}
          limit={result.limit}
        />
      )}

      <nav
        aria-label="Paginação"
        className="flex flex-wrap items-center justify-between gap-2"
      >
        <p className="text-sm text-muted-foreground">
          Página {result.page} de {totalPages}
        </p>
        <div className="flex gap-2">
          {result.page > 1 ? (
            <Link
              className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm hover:bg-muted"
              href={`/${tenantSlug}/aprovacoes/runtime?page=${result.page - 1}&limit=${result.limit}`}
            >
              Anterior
            </Link>
          ) : null}
          {result.page < totalPages ? (
            <Link
              className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm hover:bg-muted"
              href={`/${tenantSlug}/aprovacoes/runtime?page=${result.page + 1}&limit=${result.limit}`}
            >
              Próxima
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
