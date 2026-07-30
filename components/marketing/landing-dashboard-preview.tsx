import { brandConfig } from "@/config/brand";
import { cn } from "@/lib/utils";

type Props = {
  compact?: boolean;
  className?: string;
};

/**
 * Prévia visual demonstrativa do dashboard premium.
 * Placeholders claramente demonstrativos — não fingem dados de tenant real.
 */
export function LandingDashboardPreview({ compact = false, className }: Props) {
  const kpis = [
    { label: "Faturamento", value: "R$ —", hint: "Exemplo" },
    { label: "Lucro", value: "—", hint: "Exemplo" },
    { label: "Margem", value: "— %", hint: "Exemplo" },
    { label: "EBITDA", value: "—", hint: "Exemplo" },
    { label: "Caixa", value: "R$ —", hint: "Exemplo" },
    { label: "Meta", value: "— %", hint: "Exemplo" },
  ];

  return (
    <div
      data-landing-block="dashboard-preview"
      aria-label="Prévia demonstrativa do dashboard executivo"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--brand-gold)]/25 bg-[var(--brand-graphite)]/95",
        "shadow-[0_24px_80px_-24px_rgb(0_0_0_/0.7),0_0_48px_rgb(201_168_76_/0.14)]",
        compact ? "p-3 sm:p-4" : "p-4 sm:p-5 lg:p-6",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,168,76,0.16),transparent_58%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-8 top-8 size-40 rounded-full bg-[var(--brand-gold)]/15 blur-2xl"
        aria-hidden
      />

      <div className="relative mb-4 flex items-center justify-between gap-2">
        <p className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-white sm:text-base">
          Cockpit Executivo
        </p>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] tracking-[0.12em] text-[var(--brand-gold)] uppercase">
          Demonstração
        </span>
      </div>

      <div className="relative grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.label}
            className={cn(
              "rounded-xl border border-white/10 bg-[var(--brand-navy)]/80 p-3",
              index === 0 &&
                "border-[var(--brand-gold)]/25 shadow-[0_0_24px_rgb(201_168_76_/0.12)] sm:-translate-y-1",
            )}
          >
            <p className="text-[9px] tracking-[0.12em] text-white/50 uppercase">
              {kpi.label}
            </p>
            <p className="mt-2 whitespace-nowrap text-sm font-semibold tabular-nums text-white sm:text-base">
              {kpi.value}
            </p>
            <p className="mt-1 text-[10px] text-[var(--brand-gold)]/70">
              {kpi.hint}
            </p>
          </div>
        ))}
      </div>

      <div className="relative mt-4 grid gap-3 lg:grid-cols-12">
        <div
          className={cn(
            "rounded-xl border border-white/10 bg-[var(--brand-navy)]/70 p-3 sm:p-4",
            "lg:col-span-7",
            !compact && "sm:-translate-y-0.5",
          )}
        >
          <p className="text-[10px] tracking-wide text-white/50 uppercase">
            Faturamento
          </p>
          <svg
            viewBox="0 0 200 72"
            className="mt-3 h-28 w-full sm:h-32"
            role="img"
            aria-label="Gráfico demonstrativo de faturamento"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="demoRevFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand-gold)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--brand-gold)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon
              fill="url(#demoRevFill)"
              points="0,72 0,48 20,44 40,46 60,30 80,34 100,22 120,28 140,18 160,24 180,12 200,16 200,72"
            />
            <polyline
              fill="none"
              stroke="var(--brand-gold)"
              strokeWidth="2.2"
              points="0,48 20,44 40,46 60,30 80,34 100,22 120,28 140,18 160,24 180,12 200,16"
            />
            <circle cx="200" cy="16" r="3.2" fill="var(--brand-gold)" />
          </svg>
        </div>

        <div className="rounded-xl border border-[var(--brand-gold)]/20 bg-[var(--brand-navy)]/70 p-3 sm:p-4 lg:col-span-3">
          <p className="text-[10px] tracking-wide text-[var(--brand-gold)] uppercase">
            Central de Inteligência
          </p>
          <ul className="mt-3 space-y-2">
            {["Saúde de caixa", "Estoque crítico", "Margem do período"].map(
              (t) => (
                <li
                  key={t}
                  className="rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-2 text-[11px] text-white/75"
                >
                  {t}
                </li>
              ),
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-white/10 bg-[var(--brand-navy)]/70 p-3 sm:p-4 lg:col-span-2">
          <p className="text-[10px] tracking-wide text-white/50 uppercase">
            Fluxo de caixa
          </p>
          <p className="mt-2 text-[10px] text-white/45">Saldo · exemplo</p>
          <p className="mt-1 whitespace-nowrap text-sm font-semibold tabular-nums text-white">
            R$ —
          </p>
          <div className="mt-3 flex h-16 items-end gap-0.5 overflow-hidden">
            {[40, 55, 35, 70, 48, 62, 45, 58].map((h, i) => (
              <div
                key={i}
                className="min-w-0 flex-1 rounded-t bg-[var(--brand-gold)]/40"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {!compact ? (
        <div className="relative mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/8 bg-[var(--brand-navy)]/60 p-3">
            <p className="text-[10px] tracking-wide text-white/50 uppercase">
              Alertas
            </p>
            <p className="mt-2 text-xs text-white/65">
              Riscos e oportunidades com origem e confiança — sem inventar
              números.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--brand-gold)]/20 bg-[var(--brand-navy)]/60 p-3">
            <p className="text-[10px] tracking-wide text-[var(--brand-gold)] uppercase">
              Pergunte para a IA
            </p>
            <p className="mt-2 text-xs text-white/65">
              Análise baseada em regras, métricas e histórico do tenant.
            </p>
          </div>
        </div>
      ) : null}

      <p className="relative mt-3 text-[10px] text-white/35">
        Prévia ilustrativa · {brandConfig.name} {brandConfig.edition}
      </p>
    </div>
  );
}
