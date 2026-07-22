"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SituacaoBadge } from "@/components/dashboard/resumo-situacao-badge";
import { formatCurrency, formatPercent } from "@/lib/dashboard/format";
import {
  classifySituacao,
  formatDataBr,
} from "@/lib/dashboard/resumo-vendas-mes";
import type { ResumoMesDiaDetail } from "@/lib/dashboard/resumo-vendas-mes-service";
import type { ResumoDiaRow } from "@/lib/dashboard/resumo-vendas-mes";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  row: ResumoDiaRow | null;
  detail: ResumoMesDiaDetail | null;
  loading: boolean;
  error: string | null;
};

export function ResumoDiaDrawer({
  open,
  onOpenChange,
  tenantSlug,
  row,
  detail,
  loading,
  error,
}: Props) {
  const [q, setQ] = useState("");
  const [origemFilter, setOrigemFilter] = useState("");

  const filtered = useMemo(() => {
    if (!detail) return [];
    const term = q.trim().toLowerCase();
    return detail.vendas.filter((v) => {
      if (origemFilter && v.origem !== origemFilter) return false;
      if (!term) return true;
      return (
        v.cliente.toLowerCase().includes(term) ||
        (v.vendedor ?? "").toLowerCase().includes(term) ||
        v.origem.toLowerCase().includes(term) ||
        String(v.numero).includes(term)
      );
    });
  }, [detail, q, origemFilter]);

  const situacao = row
    ? classifySituacao({
        kind: row.kind,
        meta: row.meta,
        pctAtingido: detail?.pct_atingido ?? row.pct_atingido,
      })
    : "neutro";

  function exportCsv() {
    if (!detail) return;
    const header = [
      "horario",
      "numero",
      "cliente",
      "vendedor",
      "origem",
      "status",
      "bruto",
      "desconto",
      "liquido",
    ];
    const lines = [
      header.join(";"),
      ...filtered.map((v) =>
        [
          v.horario,
          v.numero,
          `"${v.cliente.replace(/"/g, '""')}"`,
          `"${(v.vendedor ?? "").replace(/"/g, '""')}"`,
          v.origem,
          v.status,
          v.valor_bruto,
          v.desconto,
          v.valor_liquido,
        ].join(";"),
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendas-${detail.data}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const titleDate = row ? formatDataBr(row.data) : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-xl"
        aria-describedby="resumo-dia-drawer-desc"
      >
        <SheetHeader className="border-b">
          <SheetTitle>Detalhes de vendas — {titleDate}</SheetTitle>
          <SheetDescription id="resumo-dia-drawer-desc">
            {row?.label_dia}
            {row?.kind === "hoje" ? " · Hoje" : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          {detail && row ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <SituacaoBadge situacao={situacao} />
                <span className="text-xs text-muted-foreground">
                  Meta {detail.meta == null ? "—" : formatCurrency(detail.meta)}
                </span>
              </div>

              <section aria-labelledby="drawer-resumo">
                <h3 id="drawer-resumo" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Resumo
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Mini label="Bruto" value={formatCurrency(detail.bruto)} />
                  <Mini label="Descontos" value={formatCurrency(detail.desconto)} />
                  <Mini label="Líquido" value={formatCurrency(detail.liquido)} />
                  <Mini label="Qtd. vendas" value={String(detail.quantidade_vendas)} />
                  <Mini label="Ticket médio" value={formatCurrency(detail.ticket_medio)} />
                  <Mini
                    label="Diferença"
                    value={
                      detail.diferenca == null
                        ? "—"
                        : `${detail.diferenca >= 0 ? "+" : "-"}${formatCurrency(Math.abs(detail.diferenca))}`
                    }
                    tone={
                      detail.diferenca == null
                        ? undefined
                        : detail.diferenca >= 0
                          ? "ok"
                          : "bad"
                    }
                  />
                  <Mini
                    label="% atingido"
                    value={
                      detail.pct_atingido == null
                        ? "—"
                        : formatPercent(detail.pct_atingido)
                    }
                  />
                  <Mini label="Cancelamentos" value={String(detail.cancelamentos)} />
                  <Mini label="Estornos" value={String(detail.estornos)} />
                  <Mini
                    label="Clientes"
                    value={String(detail.clientes_atendidos)}
                  />
                  <Mini
                    label="Peças"
                    value={String(detail.pecas_vendidas)}
                  />
                  <Mini
                    label="Serviços"
                    value={String(detail.servicos_vendidos)}
                  />
                </div>
              </section>

              <section aria-labelledby="drawer-origem">
                <h3
                  id="drawer-origem"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Origem
                </h3>
                {detail.origem_resumo.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Sem vendas faturadas.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {detail.origem_resumo.map((o) => (
                      <li
                        key={o.origem}
                        className="flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs"
                      >
                        <span>
                          {o.origem}{" "}
                          <span className="text-muted-foreground">
                            ({o.quantidade})
                          </span>
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatCurrency(o.liquido)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="drawer-lista" className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3
                    id="drawer-lista"
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Detalhamento
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={exportCsv}
                    disabled={filtered.length === 0}
                    aria-label="Exportar dados do dia"
                  >
                    <Download className="size-3.5" aria-hidden />
                    Exportar
                  </Button>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      className="pl-8"
                      placeholder="Buscar cliente, vendedor…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      aria-label="Buscar vendas do dia"
                    />
                  </div>
                  <select
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                    value={origemFilter}
                    onChange={(e) => setOrigemFilter(e.target.value)}
                    aria-label="Filtrar por origem"
                  >
                    <option value="">Todas as origens</option>
                    {detail.origem_resumo.map((o) => (
                      <option key={o.origem} value={o.origem}>
                        {o.origem}
                      </option>
                    ))}
                  </select>
                </div>

                {filtered.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma venda neste filtro.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[560px] text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="px-2 py-1.5 font-medium">Horário</th>
                          <th className="px-2 py-1.5 font-medium">Cliente</th>
                          <th className="px-2 py-1.5 font-medium">Vendedor</th>
                          <th className="px-2 py-1.5 font-medium">Origem</th>
                          <th className="px-2 py-1.5 font-medium">Status</th>
                          <th className="px-2 py-1.5 text-right font-medium">
                            Bruto
                          </th>
                          <th className="px-2 py-1.5 text-right font-medium">
                            Desc.
                          </th>
                          <th className="px-2 py-1.5 text-right font-medium">
                            Líquido
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((v) => (
                          <tr key={v.id} className="border-t">
                            <td className="px-2 py-1.5 tabular-nums">
                              <Link
                                href={`/${tenantSlug}/vendas/${v.id}`}
                                className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                              >
                                #{v.numero} · {v.horario}
                              </Link>
                            </td>
                            <td className="px-2 py-1.5">{v.cliente}</td>
                            <td className="px-2 py-1.5">{v.vendedor ?? "—"}</td>
                            <td className="px-2 py-1.5">{v.origem}</td>
                            <td className="px-2 py-1.5">{v.status}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {formatCurrency(v.valor_bruto)}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {formatCurrency(v.desconto)}
                            </td>
                            <td className="px-2 py-1.5 text-right font-medium tabular-nums">
                              {formatCurrency(v.valor_liquido)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {detail.vendas_excluidas.length > 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    {detail.cancelamentos} cancelamento(s) no dia (não entram no
                    realizado).
                  </p>
                ) : null}
              </section>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Mini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "bad";
}) {
  return (
    <div className="rounded-lg border px-2.5 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold tabular-nums",
          tone === "ok" && "text-emerald-700 dark:text-emerald-400",
          tone === "bad" && "text-rose-700 dark:text-rose-400",
        )}
      >
        {value}
      </p>
    </div>
  );
}
