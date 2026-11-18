import { cn } from "@/lib/utils";

type Props = {
  rotulo: string;
  valor: string;
  detalhe?: string;
  /** 0–100: barra de progresso (ex.: atingimento da meta). */
  progresso?: number | null;
  tom?: "neutro" | "ok" | "atencao" | "critico";
};

const BARRA = { neutro: "bg-primary", ok: "bg-emerald-500", atencao: "bg-amber-500", critico: "bg-red-500" } as const;

export function KpiCard({ rotulo, valor, detalhe, progresso, tom = "neutro" }: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-4 shadow-[var(--elevation-card)]">
      <span className="text-xs font-medium text-muted-foreground">{rotulo}</span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums">{valor}</span>
      {detalhe ? <span className="text-xs text-muted-foreground">{detalhe}</span> : null}
      {progresso != null ? (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, Math.max(0, progresso)))} aria-label={rotulo}>
          <div className={cn("h-full rounded-full", BARRA[tom])} style={{ width: `${Math.min(100, Math.max(0, progresso))}%` }} />
        </div>
      ) : null}
    </div>
  );
}
