"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency } from "@/lib/financeiro/format";
import type { DreLinha } from "@/types/dre";

/**
 * Linhas que representam dedução/subtração no DRE (custos, despesas, impostos).
 * Cobre também os itens filhos do detalhamento de OPEX, que herdam o mesmo dreLinha
 * do grupo pai mesmo sem o prefixo "(-)" no rótulo.
 *
 * Baseado no código interno da linha (dreLinha), não no texto do rótulo —
 * funciona igual para qualquer segmento de negócio atendido pela plataforma.
 */
const SUBTRACTION_DRE_LINHAS = new Set([
  "deducoes",
  "cmv",
  "despesas_pessoal",
  "despesas_operacionais",
  "despesas_comerciais",
  "depreciacao_amortizacao",
  "despesas_financeiras",
  "impostos_lucro",
]);

/** O resultado final do DRE (linha mais importante do demonstrativo). */
function isFinalTotal(linha: DreLinha): boolean {
  return linha.codigo === "resultado_final";
}

/** Subtotais intermediários (Receita líquida, Margem, EBITDA, EBIT, etc.). */
function isSubtotal(linha: DreLinha): boolean {
  return Boolean(linha.destaque) && !isFinalTotal(linha);
}

function isSubtractionLine(linha: DreLinha): boolean {
  return linha.dreLinha ? SUBTRACTION_DRE_LINHAS.has(linha.dreLinha) : false;
}

type Tone = "positive" | "negative" | "neutral";

function toneFor(linha: DreLinha): Tone {
  if (linha.destaque) {
    if (linha.valor > 0) return "positive";
    if (linha.valor < 0) return "negative";
    return "neutral";
  }
  if (isSubtractionLine(linha)) return "negative";
  if (linha.valor < 0) return "negative";
  return "neutral";
}

/** Cor do valor — saturação cheia nos totais, mais discreta nas linhas de detalhe. */
function valueColorClass(linha: DreLinha, tone: Tone): string {
  if (tone === "positive") {
    return isFinalTotal(linha)
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-emerald-700/90 dark:text-emerald-400/90";
  }
  if (tone === "negative") {
    return linha.destaque
      ? "text-rose-700 dark:text-rose-400"
      : "text-rose-600/80 dark:text-rose-400/75";
  }
  return "text-foreground";
}

/** Pílula de percentual — reforça a leitura sem competir com o valor principal. */
function pctChipClass(tone: Tone): string {
  if (tone === "positive") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (tone === "negative") {
    return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  return "bg-muted text-muted-foreground";
}

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

  const finalTotal = isFinalTotal(linha);
  const subtotal = isSubtotal(linha);
  const tone = toneFor(linha);
  const colorClass = valueColorClass(linha, tone);

  const valueCell = (
    <div className="flex items-center gap-3">
      <p
        className={`min-w-[112px] text-right text-sm tabular-nums ${colorClass} ${
          finalTotal ? "text-base font-bold" : subtotal ? "font-semibold" : ""
        }`}
      >
        {formatCurrency(linha.valor)}
      </p>
      {linha.pctReceitaLiquida != null ? (
        <span
          className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums sm:inline ${pctChipClass(
            tone,
          )}`}
        >
          {linha.pctReceitaLiquida.toFixed(1)}% RL
        </span>
      ) : null}
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
          finalTotal
            ? "truncate text-base font-bold"
            : subtotal
              ? "truncate text-sm font-semibold"
              : depth > 0
                ? "truncate text-xs text-muted-foreground"
                : "truncate text-sm text-foreground/85"
        }
      >
        {linha.label}
      </p>
    </div>
  );

  const shellClass = `flex items-center justify-between gap-4 px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    finalTotal
      ? "mt-1 rounded-md border-t-2 border-foreground/20 bg-muted/30 py-3"
      : subtotal
        ? "border-t border-border/70 py-3"
        : "py-2"
  } ${active ? "bg-muted/40" : finalTotal ? "" : "hover:bg-muted/30"}`;

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
      <div className="flex flex-col">
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
