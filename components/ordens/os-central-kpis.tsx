import Link from "next/link";

import type { OsCentralKpis } from "@/lib/ordens/os-central-compose";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type KpiDef = {
  key: keyof OsCentralKpis;
  label: string;
  href?: string;
  format?: "number" | "currency";
  tone?: "default" | "warn" | "danger" | "ok";
  supporting?: string;
  /** Se true e valor null, o card não é renderizado. */
  hideIfNull?: boolean;
};

type Props = {
  tenantSlug: string;
  kpis: OsCentralKpis;
};

function formatValue(
  value: number | null,
  format: "number" | "currency" = "number",
) {
  if (value == null || Number.isNaN(value)) return "—";
  if (format === "currency") return formatCurrency(value);
  return value.toLocaleString("pt-BR");
}

export function OsCentralKpis({ tenantSlug, kpis }: Props) {
  const base = `/${tenantSlug}/ordens`;
  const defs: KpiDef[] = [
    { key: "abertas", label: "OS abertas", href: base },
    {
      key: "emDiagnostico",
      label: "Em diagnóstico",
      href: `${base}?status=aguardando_diagnostico`,
    },
    {
      key: "aguardandoAprovacao",
      label: "Aguardando aprovação",
      href: `${base}?status=aguardando_aprovacao`,
      tone: "warn",
    },
    {
      key: "aguardandoPecas",
      label: "Aguardando peças",
      href: `${base}?status=aguardando_peca`,
      tone: "warn",
    },
    {
      key: "emExecucao",
      label: "Em execução",
      href: `${base}?status=em_execucao`,
    },
    {
      key: "finalizadasHoje",
      label: "Finalizadas hoje",
      tone: "ok",
    },
    {
      key: "entreguesHoje",
      label: "Entregues hoje",
      tone: "ok",
      hideIfNull: true,
    },
    {
      key: "atrasadas",
      label: "Atrasadas",
      href: `${base}?sort=mais_atrasadas`,
      tone: kpis.atrasadas > 0 ? "danger" : "default",
    },
    {
      key: "ticketMedio",
      label: "Ticket médio",
      format: "currency",
    },
    {
      key: "valorEmProducao",
      label: "Valor em produção",
      format: "currency",
      supporting: "Valor estimado das OS em andamento.",
    },
  ];

  return (
    <div
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
      data-os-block="central-kpis"
      role="region"
      aria-label="Indicadores da Central de OS"
    >
      {defs.map((def) => {
        const raw = kpis[def.key];
        if (def.hideIfNull && raw == null) return null;
        const value = formatValue(
          typeof raw === "number" ? raw : null,
          def.format ?? "number",
        );
        const className = cn(
          "rounded-xl border bg-card p-3.5 transition sm:p-4",
          def.tone === "warn" && "border-amber-400/45",
          def.tone === "danger" && "border-rose-400/55",
          def.tone === "ok" && "border-emerald-400/45",
          def.href && "hover:border-foreground/25",
        );
        const body = (
          <>
            <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
              {def.label}
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
              {value}
            </p>
            {def.supporting ? (
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                {def.supporting}
              </p>
            ) : null}
          </>
        );
        if (def.href) {
          return (
            <Link
              key={def.key}
              href={def.href}
              className={className}
              aria-label={`${def.label}: ${value}`}
            >
              {body}
            </Link>
          );
        }
        return (
          <div
            key={def.key}
            className={className}
            aria-label={`${def.label}: ${value}`}
          >
            {body}
          </div>
        );
      })}
    </div>
  );
}
