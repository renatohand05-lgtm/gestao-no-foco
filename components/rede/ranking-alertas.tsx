import { StatusDot } from "@/components/rede/status";
import { SectionCard } from "@/components/ui/section-card";
import { formatarValor, textoMeta, type Alerta, type LinhaRanking } from "@/lib/rede/calculo";
import { INDICADORES } from "@/lib/rede/tipos";
import { cn } from "@/lib/utils";

export function RankingLojas({ linhas }: { linhas: LinhaRanking[] }) {
  return (
    <SectionCard title="Ranking das lojas" description="Ordem: indicadores dentro da meta; desempate pelo % da meta de vendas. TOP = metade de cima.">
      {linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma loja em operação.</p>
      ) : (
        <ol className="space-y-3">
          {linhas.map((l) => {
            const pct = l.comMeta > 0 ? (l.ok / l.comMeta) * 100 : 0;
            const cor = l.comMeta === 0 ? "bg-muted-foreground/40" : pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
            return (
              <li key={l.lojaId} className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-3">
                <span className={cn("grid size-7 place-items-center rounded-full text-xs font-semibold", l.pos === 1 ? "bg-amber-400 text-amber-950" : "bg-muted text-muted-foreground")}>{l.pos}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{l.nome}</span>
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", l.tag === "TOP" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-700 dark:text-red-400")}>{l.tag}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", cor)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground" title={`${l.ok} de ${l.comMeta} indicadores com meta estão dentro dela (${l.avaliados} com dado lançado)`}>
                  {l.ok}/{l.comMeta}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </SectionCard>
  );
}

export function AlertasRede({ alertas }: { alertas: Alerta[] }) {
  const criticos = alertas.filter((a) => a.status === "bad").length;
  const atencao = alertas.length - criticos;
  return (
    <SectionCard title="Alertas" description={`${criticos} críticos · ${atencao} em atenção`}>
      {alertas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todos os indicadores com dado estão dentro da meta.</p>
      ) : (
        <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
          {alertas.map((a) => {
            const def = INDICADORES.find((d) => d.k === a.indicador);
            return (
              <li key={`${a.lojaId}-${a.indicador}`} className="flex items-start gap-2 text-sm">
                <StatusDot status={a.status} className="mt-1.5" />
                <p>
                  <strong>
                    {a.lojaNome} · {a.nome}
                  </strong>{" "}
                  <span className="text-muted-foreground">
                    {def ? formatarValor(def.formato, a.valor) : a.valor} — meta {def ? textoMeta(def.formato, a.metaEfetiva, a.direcao) : ""}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
