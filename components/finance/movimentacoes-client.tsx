"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { FinancePeriodFilter } from "@/components/finance/finance-period-filter";
import { MovementForm } from "@/components/finance/movement-form";
import { MovementTable } from "@/components/finance/movement-table";
import { deleteMovement, listTreasuryMovements } from "@/lib/finance/actions";
import type {
  BankAccount,
  CashMovement,
  Category,
  CostCenter,
  TreasuryMovementPage,
} from "@/lib/finance";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = {
  tenantSlug: string;
  accounts: BankAccount[];
  categories: Category[];
  costCenters: CostCenter[];
  initialPage: TreasuryMovementPage | null;
  error?: string | null;
};

export function MovimentacoesClient({
  tenantSlug,
  accounts,
  categories,
  costCenters,
  initialPage,
  error,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [pageData, setPageData] = useState(initialPage);
  const [localError, setLocalError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      accountId: searchParams.get("account") || "",
      kind: searchParams.get("kind") || "all",
      categoryId: searchParams.get("category") || "",
      costCenterId: searchParams.get("cc") || "",
      minAmount: searchParams.get("min") || "",
      maxAmount: searchParams.get("max") || "",
      search: searchParams.get("q") || "",
      status: searchParams.get("status") || "all",
      sort: searchParams.get("sort") || "date_desc",
      page: Number(searchParams.get("page") || "1"),
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      period: searchParams.get("period") || "30d",
    }),
    [searchParams],
  );

  function patchParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    }
    startTransition(async () => {
      router.replace(`?${next.toString()}`);
      const res = await listTreasuryMovements(tenantSlug, {
        accountId: next.get("account"),
        kind: (next.get("kind") as CashMovement["kind"] | "all") || "all",
        categoryId: next.get("category"),
        costCenterId: next.get("cc"),
        minAmount: next.get("min") ? Number(next.get("min")) : null,
        maxAmount: next.get("max") ? Number(next.get("max")) : null,
        search: next.get("q"),
        status: (next.get("status") as "all" | "normal" | "estornada") || "all",
        sort: (next.get("sort") as "date_desc") || "date_desc",
        page: Number(next.get("page") || "1"),
        from: next.get("from"),
        to: next.get("to"),
        perPage: 25,
      });
      if (!res.success) {
        setLocalError(res.error);
        return;
      }
      setLocalError(null);
      setPageData(res.page);
    });
  }

  const displayError = error || localError;

  return (
    <div className="space-y-6" data-movimentacoes-client aria-busy={pending}>
      <FinancePeriodFilter />

      <div className="grid gap-2 rounded-xl border border-border/60 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs">
          Conta
          <select
            className="mt-1 w-full rounded border border-input bg-transparent px-2 py-1.5"
            value={filters.accountId}
            onChange={(e) => patchParams({ account: e.target.value, page: "1" })}
          >
            <option value="">Todas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Tipo
          <select
            className="mt-1 w-full rounded border border-input bg-transparent px-2 py-1.5"
            value={filters.kind}
            onChange={(e) => patchParams({ kind: e.target.value, page: "1" })}
          >
            <option value="all">Todos</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
            <option value="transferencia">Transferência</option>
            <option value="ajuste">Ajuste</option>
            <option value="estorno">Estorno</option>
          </select>
        </label>
        <label className="text-xs">
          Categoria
          <select
            className="mt-1 w-full rounded border border-input bg-transparent px-2 py-1.5"
            value={filters.categoryId}
            onChange={(e) => patchParams({ category: e.target.value, page: "1" })}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Centro de custo
          <select
            className="mt-1 w-full rounded border border-input bg-transparent px-2 py-1.5"
            value={filters.costCenterId}
            onChange={(e) => patchParams({ cc: e.target.value, page: "1" })}
          >
            <option value="">Todos</option>
            {costCenters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Valor mín.
          <input
            className="mt-1 w-full rounded border border-input bg-transparent px-2 py-1.5"
            value={filters.minAmount}
            onChange={(e) => patchParams({ min: e.target.value, page: "1" })}
          />
        </label>
        <label className="text-xs">
          Valor máx.
          <input
            className="mt-1 w-full rounded border border-input bg-transparent px-2 py-1.5"
            value={filters.maxAmount}
            onChange={(e) => patchParams({ max: e.target.value, page: "1" })}
          />
        </label>
        <label className="text-xs">
          Status
          <select
            className="mt-1 w-full rounded border border-input bg-transparent px-2 py-1.5"
            value={filters.status}
            onChange={(e) => patchParams({ status: e.target.value, page: "1" })}
          >
            <option value="all">Todos</option>
            <option value="normal">Normal</option>
            <option value="estornada">Estornada</option>
          </select>
        </label>
        <label className="text-xs">
          Ordenação
          <select
            className="mt-1 w-full rounded border border-input bg-transparent px-2 py-1.5"
            value={filters.sort}
            onChange={(e) => patchParams({ sort: e.target.value })}
          >
            <option value="date_desc">Data ↓</option>
            <option value="date_asc">Data ↑</option>
            <option value="amount_desc">Valor ↓</option>
            <option value="amount_asc">Valor ↑</option>
          </select>
        </label>
        <label className="text-xs sm:col-span-2">
          Texto livre
          <input
            className="mt-1 w-full rounded border border-input bg-transparent px-2 py-1.5"
            value={filters.search}
            placeholder="Descrição ou notas"
            onChange={(e) => patchParams({ q: e.target.value, page: "1" })}
          />
        </label>
      </div>

      {pageData ? (
        <div className="grid gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-border/40 px-3 py-2">
            <p className={gofTypography.caption}>Registos</p>
            <p className="font-semibold tabular-nums">{pageData.total}</p>
          </div>
          <div className="rounded-lg border border-border/40 px-3 py-2">
            <p className={gofTypography.caption}>Entradas</p>
            <p className="font-semibold tabular-nums text-emerald-700">
              {money(pageData.totalInflows)}
            </p>
          </div>
          <div className="rounded-lg border border-border/40 px-3 py-2">
            <p className={gofTypography.caption}>Saídas</p>
            <p className="font-semibold tabular-nums text-red-700">
              {money(pageData.totalOutflows)}
            </p>
          </div>
          <div className="rounded-lg border border-border/40 px-3 py-2">
            <p className={gofTypography.caption}>Líquido</p>
            <p
              className={cn(
                "font-semibold tabular-nums",
                pageData.net >= 0 ? "text-emerald-700" : "text-red-700",
              )}
            >
              {money(pageData.net)}
            </p>
          </div>
        </div>
      ) : null}

      {displayError ? (
        <p className="text-sm text-red-600" role="alert">
          {displayError}
        </p>
      ) : null}

      <MovementForm
        tenantSlug={tenantSlug}
        accounts={accounts}
        categories={categories}
        costCenters={costCenters}
        onDone={() => router.refresh()}
      />

      {!pageData || pageData.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhuma movimentação com os filtros atuais.
        </p>
      ) : (
        <>
          <MovementTable
            movements={pageData.items}
            onDelete={(id) =>
              startTransition(async () => {
                await deleteMovement(tenantSlug, id);
                router.refresh();
              })
            }
          />
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              Página {pageData.page} de {pageData.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="h-8 rounded border border-input px-3 disabled:opacity-40"
                disabled={pageData.page <= 1}
                onClick={() =>
                  patchParams({ page: String(pageData.page - 1) })
                }
              >
                Anterior
              </button>
              <button
                type="button"
                className="h-8 rounded border border-input px-3 disabled:opacity-40"
                disabled={pageData.page >= pageData.totalPages}
                onClick={() =>
                  patchParams({ page: String(pageData.page + 1) })
                }
              >
                Seguinte
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
