import Link from "next/link";

import {
  ExecutiveCard,
  ExecutiveSection,
} from "@/components/executive";
import { formatCurrency } from "@/lib/dashboard/format";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { CommercialPanelData } from "@/types/commercial-panel";

type Props = {
  tenantSlug: string;
  data: CommercialPanelData;
};

export function ComercialDailyEvolution({ tenantSlug, data }: Props) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const maxDaily = Math.max(
    ...data.daily.map((d) => Math.max(d.realizado, d.meta_diaria, d.projetado)),
    1,
  );

  const maxAcum = Math.max(
    ...data.daily.map((d) =>
      Math.max(d.acumulado_realizado, d.acumulado_meta, d.acumulado_projetado),
    ),
    1,
  );

  return (
    <ExecutiveSection
      title="Evolução diária"
      description="Mesmos dados de sempre — leitura visual refinada."
    >
      <div className="space-y-4">
        <ExecutiveCard padding={20} className={exAnimations.fade}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold tracking-tight">
                Dash diário do mês
              </h4>
              <p className={exTypography.caption}>{data.meta_diaria_regra}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-emerald-600" /> Realizado
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-blue-600" /> Meta
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-violet-500/80" /> Projeção
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-muted-foreground/40" /> FDS
              </span>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <div
              className="flex min-w-[40rem] items-end gap-1"
              role="img"
              aria-label="Realizado diário versus meta diária"
            >
              {data.daily.map((d) => {
                const hReal = (d.realizado / maxDaily) * 100;
                const hMeta = (d.meta_diaria / maxDaily) * 100;
                const hProj = (d.projetado / maxDaily) * 100;
                const isToday = d.data === todayIso;
                return (
                  <Link
                    key={d.data}
                    href={`/${tenantSlug}/vendas?dataDe=${d.data}&dataAte=${d.data}&status=faturado`}
                    className={cn(
                      "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-0.5",
                      exAnimations.focusRing,
                      d.is_weekend && "opacity-65",
                      isToday && "bg-blue-600/5 ring-1 ring-blue-600/30",
                    )}
                    title={`${d.data}: realizado ${formatCurrency(d.realizado)} · meta ${formatCurrency(d.meta_diaria)}${isToday ? " · Hoje" : ""}`}
                    aria-label={`${d.data}, realizado ${formatCurrency(d.realizado)}, meta ${formatCurrency(d.meta_diaria)}`}
                  >
                    <div className="flex h-28 w-full items-end justify-center gap-px sm:h-36">
                      {d.is_future ? (
                        <div
                          className="w-full max-w-3 rounded-t bg-violet-500/70 motion-safe:transition-[height] motion-safe:duration-500"
                          style={{
                            height: `${hProj}%`,
                            minHeight: d.projetado > 0 ? "2px" : "0",
                          }}
                        />
                      ) : (
                        <>
                          <div
                            className="w-full max-w-2.5 rounded-t bg-emerald-600/90 motion-safe:transition-[height] motion-safe:duration-500"
                            style={{
                              height: `${hReal}%`,
                              minHeight: d.realizado > 0 ? "2px" : "0",
                            }}
                          />
                          <div
                            className="w-full max-w-2.5 rounded-t bg-blue-600/85 motion-safe:transition-[height] motion-safe:duration-500"
                            style={{
                              height: `${hMeta}%`,
                              minHeight: d.meta_diaria > 0 ? "2px" : "0",
                            }}
                          />
                        </>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[9px] tabular-nums sm:text-[10px]",
                        isToday
                          ? "font-semibold text-blue-600"
                          : "text-muted-foreground",
                      )}
                    >
                      {d.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </ExecutiveCard>

        <ExecutiveCard padding={20} className={exAnimations.slide}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold tracking-tight">
                Evolução acumulada
              </h4>
              <p className={exTypography.caption}>
                Meta × realizado × projetado acumulados.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-emerald-600" /> Realizado
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-blue-600" /> Meta
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-violet-500/80" /> Projetado
              </span>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <div
              className="flex min-w-[40rem] items-end gap-1"
              role="img"
              aria-label="Acumulado meta versus realizado versus projetado"
            >
              {data.daily.map((d, index) => {
                const hReal = (d.acumulado_realizado / maxAcum) * 100;
                const hMeta = (d.acumulado_meta / maxAcum) * 100;
                const hProj = (d.acumulado_projetado / maxAcum) * 100;
                const isLast = index === data.daily.length - 1 || d.data === todayIso;
                return (
                  <div
                    key={`acum-${d.data}`}
                    className={cn(
                      "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-0.5",
                      d.is_weekend && "opacity-65",
                      isLast && !d.is_future && "bg-blue-600/5",
                    )}
                    title={`${d.data}: acum. real ${formatCurrency(d.acumulado_realizado)} · meta ${formatCurrency(d.acumulado_meta)} · proj ${formatCurrency(d.acumulado_projetado)}`}
                  >
                    <div className="relative flex h-28 w-full items-end justify-center gap-px sm:h-36">
                      <div
                        className="pointer-events-none absolute inset-x-1 bottom-0 rounded-t bg-emerald-600/10"
                        style={{ height: `${hReal}%` }}
                        aria-hidden
                      />
                      <div
                        className="relative z-10 w-full max-w-1.5 rounded-t bg-emerald-600/90"
                        style={{
                          height: `${hReal}%`,
                          minHeight: d.acumulado_realizado > 0 ? "2px" : "0",
                        }}
                      />
                      <div
                        className="relative z-10 w-full max-w-1.5 rounded-t bg-blue-600/85"
                        style={{
                          height: `${hMeta}%`,
                          minHeight: d.acumulado_meta > 0 ? "2px" : "0",
                        }}
                      />
                      <div
                        className="relative z-10 w-full max-w-1.5 rounded-t bg-violet-500/75"
                        style={{
                          height: `${hProj}%`,
                          minHeight: d.acumulado_projetado > 0 ? "2px" : "0",
                        }}
                      />
                    </div>
                    <span className="text-[9px] tabular-nums text-muted-foreground sm:text-[10px]">
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </ExecutiveCard>
      </div>
    </ExecutiveSection>
  );
}
