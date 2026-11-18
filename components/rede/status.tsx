import { cn } from "@/lib/utils";
import type { Status } from "@/lib/rede/tipos";

export const COR_STATUS: Record<Status, string> = {
  ok: "#10b981",
  warn: "#f59e0b",
  bad: "#ef4444",
  neu: "#94a3b8",
};

const ROTULO: Record<Status, string> = {
  ok: "Dentro da meta",
  warn: "Atenção",
  bad: "Crítico",
  neu: "Sem meta ou sem dado",
};

const CLASSE: Record<Status, string> = {
  ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warn: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  bad: "bg-red-500/10 text-red-700 dark:text-red-400",
  neu: "bg-muted text-muted-foreground",
};

/** Ponto colorido + texto para leitores de tela (a cor nunca é a única pista). */
export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cn("inline-block size-2 shrink-0 rounded-full", className)} style={{ backgroundColor: COR_STATUS[status] }} role="img" aria-label={ROTULO[status]} />
  );
}

export function StatusPill({ status, children, className }: { status: Status; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", CLASSE[status], className)} title={ROTULO[status]}>
      <StatusDot status={status} />
      {children}
    </span>
  );
}
