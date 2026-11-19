import { StatusDot, StatusPill } from "@/components/rede/status";
import { SectionCard } from "@/components/ui/section-card";
import { pct1, resolverMeta, statusMeta } from "@/lib/rede/calculo";
import { desvioItemPct, statusDispersao, statusItem, type AlertaCmv, type ContagemCalculada } from "@/lib/rede/financeiro";
import type { CmvItem, Loja, MetaRow } from "@/lib/rede/tipos";

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const sinal = (v: number) => `${v > 0 ? "+" : ""}${nf1.format(v)}`;

export function AlertasCmv({ alertas, semana }: { alertas: AlertaCmv[]; semana: string }) {
  const criticos = alertas.filter((a) => a.status === "bad").length;
  return (
    <SectionCard title="Alertas do CMV" description={`Semana de ${ddmm(semana)} · ${criticos} críticos · ${alertas.length - criticos} em atenção`}>
      {alertas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todas as lojas contadas estão dentro da meta e da tolerância.</p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {alertas.map((a, i) => (
            <li key={`${a.lojaId}-${a.tipo}-${i}`} className="flex items-start gap-2 text-sm">
              <StatusDot status={a.status} className="mt-1.5" />
              <p>{a.texto}</p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/** Semana × loja: CMV real, teórico e dispersão (como no painel original). O cabeçalho da semana leva a ela. */
export function TabelaSemanaLoja({
  basePath,
  lojas,
  semanas,
  calc,
  metas,
  tolPct,
  tolDispersao,
  semanaFoco,
}: {
  basePath: string;
  lojas: Pick<Loja, "id" | "nome">[];
  semanas: string[];
  calc: ContagemCalculada[];
  metas: MetaRow[];
  tolPct: number;
  tolDispersao: number;
  semanaFoco: string;
}) {
  const lojasComDado = lojas.filter((l) => calc.some((c) => c.contagem.lojaId === l.id));
  return (
    <SectionCard title="Semana a semana, por loja" description="Real (colorido pela meta de CMV da loja), teórico e dispersão em p.p. Clique na semana para abri-la.">
      {lojasComDado.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma contagem nas últimas semanas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 pr-3 text-left font-medium" rowSpan={2}>Semana</th>
                {lojasComDado.map((l) => (
                  <th key={l.id} className="px-2 py-1 text-center font-medium" colSpan={3}>
                    {l.nome}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border text-xs text-muted-foreground">
                {lojasComDado.map((l) => (
                  <ThCols key={l.id} />
                ))}
              </tr>
            </thead>
            <tbody>
              {semanas
                .slice()
                .reverse()
                .map((s) => (
                  <tr key={s} className={`border-b border-border/60 last:border-0 ${s === semanaFoco ? "bg-muted/40" : ""}`}>
                    <td className="py-2 pr-3 font-medium tabular-nums">
                      <a className="underline-offset-2 hover:underline" href={`${basePath}?semana=${s}`}>
                        {ddmm(s)}
                      </a>
                    </td>
                    {lojasComDado.map((l) => {
                      const c = calc.find((x) => x.contagem.lojaId === l.id && x.contagem.semana === s);
                      if (!c || c.pct == null) {
                        return (
                          <td key={l.id} colSpan={3} className="px-2 py-2 text-center text-xs text-muted-foreground">
                            {c ? "sem vendas" : "—"}
                          </td>
                        );
                      }
                      const m = resolverMeta(metas, l.id, "cmv", s);
                      return (
                        <CelulasLoja key={l.id} real={c.pct} teorico={c.teorico} disp={c.dispersao} statusReal={statusMeta(m.meta, m.direcao, c.pct, tolPct)} statusDisp={statusDispersao(c.dispersao, tolDispersao)} />
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function ThCols() {
  return (
    <>
      <th className="px-2 py-1 text-right font-medium">Real</th>
      <th className="px-2 py-1 text-right font-medium">Teór.</th>
      <th className="px-2 py-1 text-right font-medium">Disp.</th>
    </>
  );
}

function CelulasLoja({ real, teorico, disp, statusReal, statusDisp }: { real: number; teorico: number; disp: number | null; statusReal: "ok" | "warn" | "bad" | "neu"; statusDisp: "ok" | "warn" | "bad" | "neu" }) {
  return (
    <>
      <td className="px-2 py-2 text-right">
        <StatusPill status={statusReal}>{pct1(real)}</StatusPill>
      </td>
      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{pct1(teorico)}</td>
      <td className="px-2 py-2 text-right">{disp != null ? <StatusPill status={statusDisp}>{sinal(disp)}</StatusPill> : "—"}</td>
    </>
  );
}

/** Consumo teórico × real dos itens informados nas contagens da semana. */
export function TabelaItens({ itens, lojas, semana }: { itens: CmvItem[]; lojas: Pick<Loja, "id" | "nome">[]; semana: string }) {
  const nome = new Map(lojas.map((l) => [l.id, l.nome] as const));
  const ordenados = [...itens].sort((a, b) => (nome.get(a.lojaId) ?? "").localeCompare(nome.get(b.lojaId) ?? "", "pt-BR") || a.item.localeCompare(b.item, "pt-BR"));
  return (
    <SectionCard title={`Dispersão por item — semana de ${ddmm(semana)}`} description="Consumo real contra o teórico das fichas técnicas. Até +2% verde, até +5% amarelo, acima vermelho.">
      {ordenados.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum item informado nas contagens desta semana. Ao lançar a contagem, adicione os itens que quer acompanhar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Loja</th>
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="py-2 pr-3 text-right font-medium">Consumo teórico</th>
                <th className="py-2 pr-3 text-right font-medium">Consumo real</th>
                <th className="py-2 text-right font-medium">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((i) => {
                const d = desvioItemPct(i.consumoTeorico, i.consumoReal);
                return (
                  <tr key={`${i.lojaId}-${i.item}`} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3">{nome.get(i.lojaId) ?? "—"}</td>
                    <td className="py-2 pr-3 font-medium">{i.item}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{nf1.format(i.consumoTeorico)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{nf1.format(i.consumoReal)}</td>
                    <td className="py-2 text-right">{d != null ? <StatusPill status={statusItem(d)}>{sinal(d)}%</StatusPill> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
