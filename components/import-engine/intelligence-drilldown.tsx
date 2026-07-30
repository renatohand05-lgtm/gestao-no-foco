import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { gofMotion } from "@/lib/design-system";
import { cn } from "@/lib/utils";

/** Níveis hierárquicos do drill-down executivo (Sprint 22.9). */
export type IntelligenceDrillLevel =
  | "indicator"
  | "import"
  | "document"
  | "line"
  | "classification"
  | "entry"
  | "audit";

export type IntelligenceDrillNode = {
  level: IntelligenceDrillLevel;
  id: string;
  label: string;
  href?: string;
  meta?: string;
};

export type IntelligenceDrillPath = {
  tenantSlug: string;
  nodes: IntelligenceDrillNode[];
};

const LEVEL_LABELS: Record<IntelligenceDrillLevel, string> = {
  indicator: "Indicador",
  import: "Importação",
  document: "Documento",
  line: "Linha",
  classification: "Classificação",
  entry: "Lançamento",
  audit: "Auditoria",
};

export function buildDrillHref(
  tenantSlug: string,
  level: IntelligenceDrillLevel,
  id?: string,
): string | undefined {
  const base = `/${tenantSlug}/integracoes`;
  switch (level) {
    case "indicator":
      return base;
    case "import":
      return id ? `${base}/historico?run=${encodeURIComponent(id)}` : `${base}/historico`;
    case "document":
      return id ? `${base}/historico?doc=${encodeURIComponent(id)}` : `${base}/historico`;
    case "line":
    case "classification":
      return `${base}/revisar`;
    case "entry":
      return `/${tenantSlug}/financeiro/movimentacoes`;
    case "audit":
      return `${base}/auditoria`;
    default:
      return undefined;
  }
}

type Props = {
  path: IntelligenceDrillPath;
  className?: string;
};

/**
 * Navegação estrutural indicator → import → document → line → … → audit.
 */
export function IntelligenceDrilldown({ path, className }: Props) {
  const { nodes } = path;

  if (nodes.length === 0) {
    return (
      <nav
        aria-label="Drill-down de importação"
        data-intelligence-drilldown
        className={cn(
          "rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground",
          gofMotion.fade,
          className,
        )}
      >
        Selecione um indicador ou run para navegar em profundidade.
      </nav>
    );
  }

  return (
    <nav
      aria-label="Drill-down de importação"
      data-intelligence-drilldown
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs",
        gofMotion.fade,
        className,
      )}
    >
      <ol className="flex flex-wrap items-center gap-1">
        {nodes.map((node, idx) => {
          const href =
            node.href ?? buildDrillHref(path.tenantSlug, node.level, node.id);
          const isLast = idx === nodes.length - 1;
          return (
            <li
              key={`${node.level}-${node.id}`}
              className="inline-flex items-center gap-1"
              data-drill-level={node.level}
            >
              {href && !isLast ? (
                <Link
                  href={href}
                  className="rounded px-1 py-0.5 font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`${LEVEL_LABELS[node.level]}: ${node.label}`}
                >
                  <span className="text-muted-foreground">
                    {LEVEL_LABELS[node.level]}:
                  </span>{" "}
                  {node.label}
                </Link>
              ) : (
                <span
                  className="px-1 py-0.5 font-medium"
                  aria-current={isLast ? "page" : undefined}
                >
                  <span className="text-muted-foreground">
                    {LEVEL_LABELS[node.level]}:
                  </span>{" "}
                  {node.label}
                  {node.meta ? (
                    <span className="ml-1 text-muted-foreground">({node.meta})</span>
                  ) : null}
                </span>
              )}
              {!isLast ? (
                <ChevronRight className="size-3 text-muted-foreground" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
