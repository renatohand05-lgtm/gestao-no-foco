import { formatNumber } from "@/lib/dashboard/format";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  updatedAtLabel: string;
  vendasCount: number;
  clientesCount?: number;
  confidenceLabel: string;
  className?: string;
};

/**
 * Indicadores discretos de produto vivo — Sprint 13.4.
 * Apenas dados já carregados no dashboard (sem fetch/cálculo novo).
 */
export function ExecutiveLivePulse({
  updatedAtLabel,
  vendasCount,
  clientesCount,
  confidenceLabel,
  className,
}: Props) {
  const items = [
    { key: "sync", label: "Atualizado agora", value: updatedAtLabel },
    {
      key: "vendas",
      label: "Vendas no período",
      value: formatNumber(vendasCount),
    },
    clientesCount !== undefined
      ? {
          key: "clientes",
          label: "Clientes",
          value: formatNumber(clientesCount),
        }
      : null,
    { key: "trust", label: "Confiança", value: confidenceLabel },
    { key: "online", label: "Sessão", value: "Online" },
    { key: "data", label: "Dados", value: "Sincronizados" },
  ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-200/50 pt-3 dark:border-white/[0.06]",
        exAnimations.fade,
        className,
      )}
      aria-label="Status do produto"
    >
      <span
        className="inline-flex size-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse"
        aria-hidden
      />
      {items.map((item, i) => (
        <span
          key={item.key}
          className={cn(
            "inline-flex items-center gap-1.5",
            exTypography.caption,
            "text-slate-400",
          )}
        >
          {i > 0 ? (
            <span className="mr-1 text-slate-300 dark:text-white/15" aria-hidden>
              ·
            </span>
          ) : null}
          <span className="text-slate-400/90">{item.label}</span>
          <span className="font-medium tabular-nums text-slate-500 dark:text-slate-400">
            {item.value}
          </span>
        </span>
      ))}
    </div>
  );
}
