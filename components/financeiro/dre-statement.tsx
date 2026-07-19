"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency } from "@/lib/financeiro/format";
import type { DreLinha } from "@/types/dre";

type Props = {
  linhas: DreLinha[];
  tenantSlug: string;
  query: {
    dataDe: string;
    dataAte: string;
    centroCusto?: string;
    categoria?: string;
    planoConta?: string;
    linha?: string;
    detalhe?: string;
  };
};

function hrefFor(
  tenantSlug: string,
  query: Props["query"],
  linhaEconomica: string,
  detalhe?: string,
) {
  const params = new URLSearchParams();
  params.set("dataDe", query.dataDe);
  params.set("dataAte", query.dataAte);
  if (query.centroCusto) params.set("centroCusto", query.centroCusto);
  if (query.categoria) params.set("categoria", query.categoria);
  if (query.planoConta) params.set("planoConta", query.planoConta);
  params.set("linha", linhaEconomica);
  if (detalhe) params.set("detalhe", detalhe);
  return `/${tenantSlug}/financeiro/dre?${params.toString()}`;
}

function Row({
  linha,
  tenantSlug,
  query,
  expanded,
  onToggle,
}: {
  linha: DreLinha;
  tenantSlug: string;
  query: Props["query"];
  expanded: Set<string>;
  onToggle: (key: string) => void;
}) {
  const depth = linha.depth ?? 0;
  const pad = depth * 16;
  const active =
    Boolean(linha.dreLinha) &&
    query.linha === linha.dreLinha &&
    (query.detalhe ?? "") === (linha.dreDetalhe ?? "");
  const isOpen = expanded.has(linha.codigo);
  const hasChildren = (linha.children?.length ?? 0) > 0;

  const valueCell = (
    <div className="flex items-center gap-3">
      {linha.pctReceitaLiquida != null ? (
        <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
          {linha.pctReceitaLiquida.toFixed(1)}% RL
        </span>
      ) : null}
      <p
        className={`text-sm tabular-nums ${
          linha.valor < 0
            ? "text-rose-700 dark:text-rose-400"
            : linha.destaque
              ? "text-foreground"
              : ""
        }`}
      >
        {formatCurrency(linha.valor)}
      </p>
    </div>
  );

  const label = (
    <div className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: pad }}>
      {hasChildren || linha.expandable ? (
        <button
          type="button"
          aria-label={isOpen ? "Recolher" : "Expandir"}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle(linha.codigo);
          }}
        >
          {isOpen ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>
      ) : (
        <span className="inline-block w-5" />
      )}
      <p
        className={
          linha.destaque
            ? "truncate text-sm font-semibold"
            : depth > 0
              ? "truncate text-sm"
              : "truncate text-sm text-muted-foreground"
        }
      >
        {linha.label}
      </p>
    </div>
  );

  const shellClass = `flex items-center justify-between gap-4 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    active ? "bg-muted/40" : "hover:bg-muted/30"
  }`;

  return (
    <>
      {linha.drillable && linha.dreLinha ? (
        <Link
          href={hrefFor(
            tenantSlug,
            query,
            linha.dreLinha,
            linha.dreDetalhe,
          )}
          className={shellClass}
          aria-current={active ? "true" : undefined}
        >
          {label}
          {valueCell}
        </Link>
      ) : (
        <div className={shellClass}>
          {label}
          {valueCell}
        </div>
      )}
      {isOpen && hasChildren
        ? linha.children!.map((child) => (
            <Row
              key={child.codigo}
              linha={child}
              tenantSlug={tenantSlug}
              query={query}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))
        : null}
    </>
  );
}

export function DreStatement({ linhas, tenantSlug, query }: Props) {
  const defaultExpanded = useMemo(() => {
    const set = new Set<string>();
    for (const line of linhas) {
      if (line.dreLinha === "despesas_operacionais") {
        set.add(line.codigo);
      }
    }
    return set;
  }, [linhas]);

  const [expanded, setExpanded] = useState<Set<string>>(defaultExpanded);

  function onToggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <SectionCard
      title="Demonstrativo"
      description="DRE por competência — expanda despesas operacionais para grupos e linhas. Clique para drill-down."
    >
      <div className="divide-y divide-border/70">
        {linhas.map((linha) => (
          <Row
            key={linha.codigo}
            linha={linha}
            tenantSlug={tenantSlug}
            query={query}
            expanded={expanded}
            onToggle={onToggle}
          />
        ))}
      </div>
    </SectionCard>
  );
}
