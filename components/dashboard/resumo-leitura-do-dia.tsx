import type { LeituraDiaInsight } from "@/lib/dashboard/resumo-vendas-mes";
import { cn } from "@/lib/utils";

const TONE: Record<LeituraDiaInsight["tone"], string> = {
  success:
    "border-emerald-200/70 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/35 dark:bg-emerald-950/25 dark:text-emerald-200",
  warning:
    "border-amber-200/70 bg-amber-50/70 text-amber-900 dark:border-amber-900/35 dark:bg-amber-950/25 dark:text-amber-100",
  danger:
    "border-rose-200/70 bg-rose-50/70 text-rose-800 dark:border-rose-900/35 dark:bg-rose-950/25 dark:text-rose-200",
  info: "border-sky-200/70 bg-sky-50/70 text-sky-900 dark:border-sky-900/35 dark:bg-sky-950/25 dark:text-sky-100",
  neutral: "border-border/70 bg-muted/30 text-muted-foreground",
};

type Props = {
  insights: LeituraDiaInsight[];
};

export function ResumoLeituraDoDia({ insights }: Props) {
  if (insights.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-border/60 bg-card px-5 py-3.5 shadow-sm"
      aria-labelledby="leitura-do-dia-titulo"
    >
      <h2
        id="leitura-do-dia-titulo"
        className="text-[0.65rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
      >
        Leitura do dia
      </h2>
      <ul className="mt-2.5 flex flex-wrap gap-2.5">
        {insights.map((item) => (
          <li
            key={item.id}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] leading-snug font-medium tracking-tight",
              TONE[item.tone],
            )}
          >
            {item.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
