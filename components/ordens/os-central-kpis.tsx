import Link from "next/link";

import { MetricCard } from "@/components/executive";
import type { ExColorTone } from "@/lib/design-system/colors";
import { gofGrid } from "@/lib/design-system";
import type { OsCentralKpis } from "@/lib/ordens/os-central-compose";
import { formatCurrency } from "@/lib/format";

type KpiDef = {
  key: keyof OsCentralKpis;
  label: string;
  href?: string;
  format?: "number" | "currency";
  tone?: ExColorTone;
  supporting?: string;
  /** Se true e valor null, o card não é renderizado. */
  hideIfNull?: boolean;
  emphasize?: boolean;
};

type Props = {
  tenantSlug: string;
  kpis: OsCentralKpis;
  copy?: {
    openWorkOrdersLabel: string;
    diagnosisLabel: string;
    waitingPartsLabel: string;
    estimatedInProgressHint: string;
    centralKpisAria: string;
    automotiveWorkflow?: boolean;
  };
};

function formatValue(
  value: number | null,
  format: "number" | "currency" = "number",
) {
  if (value == null || Number.isNaN(value)) return "—";
  if (format === "currency") return formatCurrency(value);
  return value.toLocaleString("pt-BR");
}

export function OsCentralKpis({ tenantSlug, kpis, copy }: Props) {
  const base = `/${tenantSlug}/ordens`;
  const defs: KpiDef[] = [
    {
      key: "abertas",
      label: copy?.openWorkOrdersLabel ?? "OS abertas",
      href: base,
      emphasize: true,
    },
    {
      key: "emDiagnostico",
      label: copy?.diagnosisLabel ?? "Em diagnóstico",
      href: `${base}?status=aguardando_diagnostico`,
    },
    {
      key: "aguardandoAprovacao",
      label: "Aguardando aprovação",
      href: `${base}?status=aguardando_aprovacao`,
      tone: "warning",
    },
    {
      key: "aguardandoPecas",
      label: copy?.waitingPartsLabel ?? "Aguardando peças",
      href: `${base}?status=aguardando_peca`,
      tone: "warning",
    },
    {
      key: "emExecucao",
      label: "Em execução",
      href: `${base}?status=em_execucao`,
      tone: "info",
    },
    {
      key: "finalizadasHoje",
      label: "Finalizadas hoje",
      tone: "success",
    },
    {
      key: "entreguesHoje",
      label: "Entregues hoje",
      tone: "success",
      hideIfNull: true,
    },
    {
      key: "atrasadas",
      label: "Atrasadas",
      href: `${base}?sort=mais_atrasadas`,
      tone: kpis.atrasadas > 0 ? "danger" : "neutral",
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
      supporting:
        copy?.estimatedInProgressHint ?? "Valor estimado das OS em andamento.",
      tone: "info",
    },
  ];

  return (
    <div
      className={gofGrid.kpis}
      data-os-block="central-kpis"
      role="region"
      aria-label={copy?.centralKpisAria ?? "Indicadores da Central de OS"}
    >
      {defs.map((def) => {
        const raw = kpis[def.key];
        if (def.hideIfNull && raw == null) return null;
        const value = formatValue(
          typeof raw === "number" ? raw : null,
          def.format ?? "number",
        );
        const card = (
          <MetricCard
            label={def.label}
            value={value}
            hint={def.supporting}
            tone={def.tone ?? "neutral"}
            emphasize={def.emphasize}
            className="h-full"
          />
        );
        if (def.href) {
          return (
            <Link
              key={def.key}
              href={def.href}
              className="block h-full min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40"
              aria-label={`${def.label}: ${value}`}
            >
              {card}
            </Link>
          );
        }
        return (
          <div key={def.key} aria-label={`${def.label}: ${value}`}>
            {card}
          </div>
        );
      })}
    </div>
  );
}
