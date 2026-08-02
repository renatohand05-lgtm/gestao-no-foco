import Link from "next/link";

import type { CockpitAlert } from "@/lib/dashboard/cockpit-v2/alerts";
import { cn } from "@/lib/utils";

const PRIORITY_LABEL: Record<CockpitAlert["priority"], string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

const CATEGORY_LABEL: Record<CockpitAlert["category"], string> = {
  financeiro: "Financeiro",
  compras: "Compras",
  estoque: "Estoque",
  crm: "CRM",
  equipe: "Equipe",
  operacao: "Operação",
  tributario: "Tributário",
};

type Props = { alerts: CockpitAlert[] };

export function AlertsCenter({ alerts }: Props) {
  return (
    <section
      aria-label="Central de alertas"
      data-cockpit-block="alerts"
      data-sprint="30.4"
      className="rounded-2xl border border-[var(--border-premium)] bg-[var(--surface-raised)] p-4 sm:p-5 dark:bg-[var(--brand-graphite-elevated)]/90"
      data-ux-polish="30.4.1"
    >
      <p className="text-[10px] font-medium tracking-[0.14em] text-[var(--brand-gold)] uppercase">
        Central de alertas
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight">
        Prioridade e ação
      </h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Somente evidências reais do ciclo — sem alertas fictícios.
      </p>

      {alerts.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]" role="status">
          Nenhum alerta acionável neste ciclo.
        </p>
      ) : (
        <ul className="mt-3 max-h-[28rem] space-y-1.5 overflow-y-auto pr-1">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-xl border px-3 py-2.5",
                a.priority === "critica" && "border-danger/40 bg-danger/5",
                a.priority === "alta" && "border-warning/40 bg-warning/5",
                (a.priority === "media" || a.priority === "baixa") &&
                  "border-border/60",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] font-medium uppercase">
                  {PRIORITY_LABEL[a.priority]}
                </span>
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px]">
                  {CATEGORY_LABEL[a.category]}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {a.source}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium">{a.title}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)] text-pretty">
                {a.description}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Impacto: {a.impact}
              </p>
              <Link
                href={a.href}
                className="mt-2 inline-flex min-h-10 items-center text-xs font-medium text-[var(--brand-gold)] hover:underline"
              >
                {a.suggestedAction} →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
