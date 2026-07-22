import {
  SITUACAO_LABEL,
  type SituacaoDia,
} from "@/lib/dashboard/resumo-vendas-mes";
import { cn } from "@/lib/utils";

const SITUACAO_CLASS: Record<SituacaoDia, string> = {
  muito_abaixo:
    "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  abaixo:
    "bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200",
  atencao:
    "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  atingida:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  superou:
    "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950",
  futuro: "bg-muted text-muted-foreground",
  neutro: "bg-muted text-muted-foreground",
};

export function SituacaoBadge({
  situacao,
  className,
}: {
  situacao: SituacaoDia;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        SITUACAO_CLASS[situacao],
        className,
      )}
      aria-label={`Situação: ${SITUACAO_LABEL[situacao]}`}
    >
      {SITUACAO_LABEL[situacao]}
    </span>
  );
}
