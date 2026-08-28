import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard } from "lucide-react";

import { requireAuth } from "@/lib/tenants";
import {
  getAuthorizedPlatformTenant,
  getPlatformBillingSummary,
} from "@/lib/platform/platform-access-service";
import { PartnerTenantManageForm } from "@/components/platform/partner-tenant-manage-form";
import { formatCurrency } from "@/lib/format";
import { CATALOG_SEGMENT_SHORT_LABEL } from "@/lib/segments/catalog-labels";
import type { ProductSegmentId } from "@/lib/segments/types";

export const metadata = { title: "Gerenciar empresa · Gestão no Foco" };

function segmentLabel(segment: string | null) {
  if (!segment) return "Sem segmento";
  return CATALOG_SEGMENT_SHORT_LABEL[segment as ProductSegmentId] ?? segment;
}

export default async function ManageReferredTenantPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  await requireAuth();
  const { tenantId } = await params;

  const authorized = await getAuthorizedPlatformTenant(tenantId);
  if (!authorized) {
    notFound();
  }

  const { access, tenant } = authorized;
  const billing = await getPlatformBillingSummary(access);
  const tenantBillingRows =
    billing?.rows.filter((r) => r.tenantId === tenantId) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/master/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[var(--brand-gold,#C9A84C)]"
      >
        <ArrowLeft className="size-4" />
        Voltar para Visão do Dono
      </Link>

      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-gold,#C9A84C)]">
          Gerenciar empresa
        </p>
        <h1 className="text-2xl font-bold text-foreground">
          {tenant.tenantName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {segmentLabel(tenant.segment)} ·{" "}
          <Link
            href={`/${tenant.tenantSlug}/dashboard`}
            className="underline hover:text-[var(--brand-gold,#C9A84C)]"
          >
            Ver dashboard da empresa
          </Link>
        </p>
      </header>

      <div className="rounded-xl border border-border/70 bg-card/40 p-5">
        <div className="mb-3 flex items-center gap-2">
          <CreditCard className="size-4 text-[var(--brand-gold,#C9A84C)]" />
          <p className="text-sm font-semibold text-foreground">
            Cobrança / plano
          </p>
        </div>
        {tenantBillingRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma assinatura cadastrada para esta empresa ainda.
          </p>
        ) : (
          <div className="space-y-1.5">
            {tenantBillingRows.map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-foreground/85">
                  {row.planName ?? "Sem plano"}
                  {row.isPilot ? " · piloto" : ""}
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className={
                      row.status === "active"
                        ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"
                        : "rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    }
                  >
                    {row.status ?? "—"}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {row.amountCents != null
                      ? formatCurrency(row.amountCents / 100)
                      : "—"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <PartnerTenantManageForm
        tenantId={tenant.tenantId}
        currentName={tenant.tenantName}
        currentSegment={tenant.segment}
      />
    </div>
  );
}
