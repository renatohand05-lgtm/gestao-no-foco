"use client";

import {
  useDeferredValue,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Filter, RotateCcw, Search } from "lucide-react";

import {
  ExecutiveEmptyState,
  ExecutiveFilter,
  ExecutiveFilterField,
} from "@/components/executive";
import { ExecutiveBadge } from "@/components/executive/ExecutiveBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  executeImportRollback,
  prepareImportRollback,
} from "@/lib/import-engine/intelligence/intelligence-actions";
import type { ImportHistoryEntry, ImportRunItem } from "@/lib/import-engine";
import { cn } from "@/lib/utils";
import { IntelligenceTimelinePanel } from "./intelligence-timeline-panel";
import {
  buildRunTimeline,
  formatDateTime,
  formatDurationMs,
  rollbackAvailable,
} from "./intelligence-presentation";

type Props = {
  tenantSlug: string;
  tenantLabel: string;
  initialRuns: ImportHistoryEntry[];
  total: number;
};

type StatusFilter = "all" | ImportHistoryEntry["status"];

function statusTone(
  status: ImportHistoryEntry["status"],
): "success" | "warning" | "danger" | "neutral" | "info" {
  if (status === "completed") return "success";
  if (status === "partial" || status === "preview") return "warning";
  if (status === "failed") return "danger";
  if (status === "rolled_back") return "info";
  return "neutral";
}

export function IntelligenceHistoryClient({
  tenantSlug,
  tenantLabel,
  initialRuns,
  total,
}: Props) {
  const [runs] = useState(initialRuns);
  const [selected, setSelected] = useState<ImportHistoryEntry | null>(null);
  const [items, setItems] = useState<ImportRunItem[]>([]);
  const [planMsg, setPlanMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const modules = useMemo(
    () => [...new Set(runs.map((r) => r.module))].sort(),
    [runs],
  );
  const users = useMemo(
    () => [...new Set(runs.map((r) => r.userLabel || r.userId))].sort(),
    [runs],
  );

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return runs.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (moduleFilter !== "all" && r.module !== moduleFilter) return false;
      if (
        userFilter !== "all" &&
        (r.userLabel || r.userId) !== userFilter
      ) {
        return false;
      }
      if (periodFrom) {
        const from = new Date(periodFrom).getTime();
        if (new Date(r.createdAt).getTime() < from) return false;
      }
      if (periodTo) {
        const to = new Date(periodTo).getTime() + 86_400_000 - 1;
        if (new Date(r.createdAt).getTime() > to) return false;
      }
      if (q) {
        const hay = `${r.fileName} ${r.userLabel} ${r.module} ${r.origin ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    runs,
    statusFilter,
    moduleFilter,
    userFilter,
    periodFrom,
    periodTo,
    deferredQuery,
  ]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    pageSafe * pageSize,
    pageSafe * pageSize + pageSize,
  );

  const timeline = useMemo(
    () => buildRunTimeline(selected ?? filtered[0] ?? null),
    [selected, filtered],
  );

  function resetFilters() {
    setStatusFilter("all");
    setModuleFilter("all");
    setUserFilter("all");
    setPeriodFrom("");
    setPeriodTo("");
    setQuery("");
    setPage(0);
  }

  function inspect(run: ImportHistoryEntry) {
    setSelected(run);
    setPlanMsg(null);
    setError(null);
    startTransition(async () => {
      const { getImportRun } = await import(
        "@/lib/import-engine/intelligence/intelligence-actions"
      );
      const res = await getImportRun(tenantSlug, run.id);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setItems(res.items);
    });
  }

  function prepare() {
    if (!selected) return;
    startTransition(async () => {
      const res = await prepareImportRollback(tenantSlug, selected.id);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setPlanMsg(
        `${res.plan.status}: ${res.plan.reason} (${res.plan.affectedRows} itens)`,
      );
    });
  }

  function execute() {
    if (!selected) return;
    startTransition(async () => {
      const res = await executeImportRollback(tenantSlug, selected.id);
      if (!res.success && !("plan" in res)) {
        setError("error" in res ? res.error : "Falha no rollback.");
        return;
      }
      if ("plan" in res && res.plan) {
        setPlanMsg(
          `Rollback ${res.plan.status}: ${res.plan.reason} · afetados ${res.plan.affectedRows}`,
        );
        setSelected({
          ...selected,
          status:
            res.plan.status === "done" ? "rolled_back" : selected.status,
          rolledBackAt:
            res.plan.status === "done"
              ? new Date().toISOString()
              : selected.rolledBackAt,
        });
      }
    });
  }

  return (
    <div className="space-y-5" data-intelligence-history>
      <p className="text-sm text-muted-foreground">
        {total} importação(ões) no tenant · {filtered.length} após filtros ·
        paginação client-side na amostra carregada.
      </p>

      <ExecutiveFilter
        label="Filtros Enterprise"
        actions={
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={resetFilters}
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Limpar
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <ExecutiveFilterField label="Período (de)">
            <input
              type="date"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={periodFrom}
              onChange={(e) => {
                setPeriodFrom(e.target.value);
                setPage(0);
              }}
              aria-label="Data inicial"
            />
          </ExecutiveFilterField>
          <ExecutiveFilterField label="Período (até)">
            <input
              type="date"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={periodTo}
              onChange={(e) => {
                setPeriodTo(e.target.value);
                setPage(0);
              }}
              aria-label="Data final"
            />
          </ExecutiveFilterField>
          <ExecutiveFilterField label="Status">
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(0);
              }}
              aria-label="Filtrar por status"
            >
              <option value="all">Todos</option>
              <option value="completed">completed</option>
              <option value="partial">partial</option>
              <option value="failed">failed</option>
              <option value="preview">preview</option>
              <option value="rolled_back">rolled_back</option>
            </select>
          </ExecutiveFilterField>
          <ExecutiveFilterField label="Módulo">
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setPage(0);
              }}
              aria-label="Filtrar por módulo"
            >
              <option value="all">Todos</option>
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </ExecutiveFilterField>
          <ExecutiveFilterField label="Utilizador">
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value);
                setPage(0);
              }}
              aria-label="Filtrar por utilizador"
            >
              <option value="all">Todos</option>
              {users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </ExecutiveFilterField>
          <ExecutiveFilterField label="Busca">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground"
                aria-hidden
              />
              <input
                className="w-full rounded-md border border-input bg-transparent py-2 pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Arquivo, origem…"
                aria-label="Buscar no histórico"
              />
            </div>
          </ExecutiveFilterField>
        </div>
      </ExecutiveFilter>

      {error ? (
        <p
          className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {planMsg ? (
        <p className="rounded-lg border border-border/60 px-3 py-2 text-sm">
          {planMsg}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Arquivo</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Utilizador</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Tempo</TableHead>
              <TableHead className="text-right">Registros</TableHead>
              <TableHead className="text-right">Aceitos</TableHead>
              <TableHead className="text-right">Rejeitados</TableHead>
              <TableHead>Confiança média</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rollback</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="p-0">
                  <ExecutiveEmptyState
                    title="Sem importações"
                    description="Ajuste os filtros ou execute uma nova importação."
                    icon={Filter}
                  />
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r) => {
                const canRollback = rollbackAvailable(r);
                return (
                  <TableRow
                    key={r.id}
                    className={cn(
                      selected?.id === r.id && "bg-muted/40",
                      "motion-safe:transition-colors",
                    )}
                  >
                    <TableCell className="max-w-[180px] truncate text-sm font-medium">
                      {r.fileName}
                    </TableCell>
                    <TableCell className="text-xs capitalize text-muted-foreground">
                      {r.origin ?? "upload"}
                    </TableCell>
                    <TableCell className="text-sm">{r.userLabel || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {tenantLabel}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTime(r.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {formatDurationMs(r.durationMs)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {r.totalRows}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {r.importedRows}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {r.rejectedRows}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        —{" "}
                        <span className="rounded border px-1 py-0.5 text-[10px]">
                          placeholder
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <ExecutiveBadge tone={statusTone(r.status)} variant="soft">
                        {r.status}
                      </ExecutiveBadge>
                    </TableCell>
                    <TableCell>
                      {r.status === "rolled_back" ? (
                        <ExecutiveBadge tone="info" variant="outline">
                          Já revertido
                        </ExecutiveBadge>
                      ) : canRollback ? (
                        <ExecutiveBadge tone="success" variant="outline">
                          Disponível
                        </ExecutiveBadge>
                      ) : (
                        <ExecutiveBadge tone="neutral" variant="outline">
                          Indisponível
                        </ExecutiveBadge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => inspect(r)}
                      >
                        Detalhe
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Página {pageSafe + 1} de {pageCount}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pageSafe <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pageSafe >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Seguinte
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <IntelligenceTimelinePanel events={timeline} />

        {selected ? (
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">
                Auditoria · {selected.fileName}
              </CardTitle>
              <CardDescription>
                Visualização enterprise do run — sem alterar motores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-2 sm:grid-cols-2">
                <AuditRow label="Utilizador" value={selected.userLabel || "—"} />
                <AuditRow label="Tenant" value={tenantLabel} />
                <AuditRow
                  label="Origem"
                  value={selected.origin ?? "upload"}
                />
                <AuditRow
                  label="Data"
                  value={formatDateTime(selected.createdAt)}
                />
                <AuditRow
                  label="Versão"
                  value={selected.engineVersion ?? "—"}
                />
                <AuditRow
                  label="Tempo"
                  value={formatDurationMs(selected.durationMs)}
                />
                <AuditRow
                  label="Rollback"
                  value={
                    selected.status === "rolled_back"
                      ? `Revertido${selected.rolledBackAt ? ` · ${formatDateTime(selected.rolledBackAt)}` : ""}`
                      : rollbackAvailable(selected)
                        ? "Disponível"
                        : "Indisponível"
                  }
                />
                <AuditRow label="Resultado" value={selected.status} />
              </dl>

              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {items.map((i) => (
                  <li key={i.id}>
                    Linha {i.rowNumber} · {i.targetType} · {i.targetId} ·{" "}
                    {i.rollbackStatus}
                  </li>
                ))}
                {items.length === 0 ? (
                  <li>Sem itens gravados neste run.</li>
                ) : null}
              </ul>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={prepare}
                >
                  Preparar rollback
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending || selected.status === "rolled_back"}
                  onClick={execute}
                >
                  Desfazer importação
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <ExecutiveEmptyState
            title="Selecione um run"
            description="Abra o detalhe para ver auditoria, itens e ações de rollback."
          />
        )}
      </div>
    </div>
  );
}

function AuditRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/50 px-3 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium capitalize">{value}</dd>
    </div>
  );
}
