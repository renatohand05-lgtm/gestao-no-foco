import Link from "next/link";
import { Building2, CreditCard } from "lucide-react";

import {
  getPlatformAccess,
  getPlatformBillingSummary,
} from "@/lib/platform/platform-access-service";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { CATALOG_SEGMENT_SHORT_LABEL } from "@/lib/segments/catalog-labels";
import type { ProductSegmentId } from "@/lib/segments/types";

function segmentLabel(segment: string | null) {
  if (!segment) return "Sem segmento";
  return CATALOG_SEGMENT_SHORT_LABEL[segment as ProductSegmentId] ?? segment;
}

export async function MinhasEmpresasSection({
  currentTenantSlug,
}: {
  currentTenantSlug: string;
}) {
  const access = await getPlatformAccess();
  if (!access) return null;

  const isOwner = access.role === "owner";
  const billing = isOwner ? await getPlatformBillingSummary(access) : null;

  return (
    <div className="space-y-6 rounded-xl border border-[var(--brand-gold,#C9A84C)]/25 bg-card/30 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-[var(--brand-gold,#C9A84C)]" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-gold,#C9A84C)]">
              {isOwner ? "Visão do Dono" : "Empresas indicadas por você"}
            </p>
            <h2 className="text-lg font-semibold text-foreground">
              Minhas empresas
            </h2>
          </div>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Faturamento total (todas)
            </p>
            <p className="text-lg font-bold tabular-nums text-foreground">
              {formatCurrencyCompact(access.totals.faturamento)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Lucro total (todas)
            </p>
            <p
              className={
                access.totals.lucroLiquido >= 0
                  ? "text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400"
                  : "text-lg font-bold tabular-nums text-rose-700 dark:text-rose-400"
              }
            >
              {formatCurrencyCompact(access.totals.lucroLiquido)}
            </p>
          </div>
        </div>
      </div>

      {access.tenants.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? "Nenhuma empresa cadastrada ainda."
            : "Nenhum cliente indicado por você ainda."}
        </p>
      ) : (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
          {access.tenants.map((tenant) => {
            const isCurrent = tenant.tenantSlug === currentTenantSlug;
            return (
              <Link
                key={tenant.tenantId}
                href={`/${tenant.tenantSlug}/dashboard`}
                className={`group w-64 shrink-0 rounded-lg border p-4 transition ${
                  isCurrent
                    ? "border-[var(--brand-gold,#C9A84C)] bg-[var(--brand-gold,#C9A84C)]/5"
                    : "border-border/70 bg-card/40 hover:border-[var(--brand-gold,#C9A84C)]/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground group-hover:text-[var(--brand-gold,#C9A84C)]">
                      {tenant.tenantName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {segmentLabel(tenant.segment)}
                    </p>
                  </div>
                  {isCurrent ? (
                    <span className="shrink-0 rounded-full bg-[var(--brand-gold,#C9A84C)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--brand-gold,#C9A84C)]">
                      Atual
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Faturamento
                    </p>
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(tenant.faturamento)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Lucro
                    </p>
                    <p
                      className={
                        tenant.lucroLiquido >= 0
                          ? "text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400"
                          : "text-sm font-semibold tabular-nums text-rose-700 dark:text-rose-400"
                      }
                    >
                      {formatCurrency(tenant.lucroLiquido)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {isOwner && billing ? (
        <div className="border-t border-border/60 pt-5">
          <div className="mb-3 flex items-center gap-2">
            <CreditCard className="size-4 text-[var(--brand-gold,#C9A84C)]" />
            <p className="text-sm font-semibold text-foreground">
              Receita da sua consultoria
            </p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Restrito a você
            </span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Receita mensal recorrente (MRR)
              </p>
              <p className="text-xl font-bold tabular-nums text-foreground">
                {formatCurrency(billing.mrrCents / 100)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Assinaturas ativas
              </p>
              <p className="text-xl font-bold tabular-nums text-foreground">
                {billing.assinaturasAtivas}
              </p>
            </div>
          </div>

          {billing.rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma assinatura cadastrada ainda.
            </p>
          ) : (
            <div className="space-y-1.5">
              {billing.rows.map((row) => (
                <div
                  key={row.tenantId}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/30"
                >
                  <span className="truncate text-foreground/85">
                    {row.tenantName}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {row.planName ?? "Sem plano"}
                      {row.isPilot ? " · piloto" : ""}
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
      ) : null}
    </div>
  );
}
