"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { ChartConfiguration } from "chart.js";

import { Grafico } from "@/components/painel-recorrencia/grafico";
import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { StatusPill } from "@/components/rede/status";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SectionCard } from "@/components/ui/section-card";
import { excluirMesAction, salvarMesAction } from "@/lib/rede/actions-rh";
import { lerNumero } from "@/lib/rede/csv";
import {
  absenteismoPct,
  DIAS_PREVISTOS_POR_PESSOA,
  LIMITES_ABSENTEISMO,
  LIMITES_TURNOVER,
  linhasCsvMovimentos,
  matrizMensal,
  semaforo,
  sugerirMes,
  turnoverPct,
  type MatrizRh,
} from "@/lib/rede/rh";
import type { ColaboradorRh, MesRh } from "@/lib/rede/tipos";

type Msg = { tipo: "success" | "error"; texto: string } | null;
type LojaRef = { id: string; nome: string };
type Cores = { texto: string; grade: string };

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const mesTxt = (iso: string) => `${MESES[Number(iso.slice(5, 7)) - 1]}/${iso.slice(2, 4)}`;
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const PALETA = ["#e5303f", "#f2b33d", "#3fc58e", "#3b82f6", "#a855f7", "#14b8a6"];
const MESES_NAS_TABELAS = 12;

type Props = {
  slug: string;
  hoje: string;
  /** AAAA-MM do mês atual: o lançamento não pode ser de mês futuro. */
  mesAtual: string;
  lojas: LojaRef[];
  mensais: MesRh[];
  /** Cadastro para sugerir os números do mês; null quando o perfil não vê o quadro de pessoal. */
  colaboradores: ColaboradorRh[] | null;
  editavel: boolean;
};

export function RhMovimentos({ slug, mesAtual, lojas, mensais, colaboradores, editavel }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [excluir, setExcluir] = useState<MesRh | null>(null);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  const nomeLoja = useMemo(() => new Map(lojas.map((l) => [l.id, l.nome] as const)), [lojas]);
  const nome = (id: string) => nomeLoja.get(id) ?? "Loja";
  const ids = useMemo(() => lojas.map((l) => l.id), [lojas]);

  // As tabelas e os gráficos mostram os últimos 12 meses com lançamento; a lista e a exportação trazem tudo o que foi carregado.
  const recentes = useMemo(() => {
    const meses = [...new Set(mensais.map((r) => r.mes))].sort().slice(-MESES_NAS_TABELAS);
    return mensais.filter((r) => meses.includes(r.mes));
  }, [mensais]);
  const matrizT = useMemo(() => matrizMensal(recentes, ids, turnoverPct), [recentes, ids]);
  const matrizA = useMemo(() => matrizMensal(recentes, ids, absenteismoPct), [recentes, ids]);

  const confirmarExclusao = () => {
    if (!excluir) return;
    setErroExcluir(null);
    iniciar(async () => {
      const r = await excluirMesAction(slug, excluir.id);
      if (r.success) {
        setExcluir(null);
        setMsg({ tipo: "success", texto: "Lançamento excluído." });
        router.refresh();
      } else setErroExcluir(r.error);
    });
  };

  return (
    <div className="space-y-5">
      {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}

      {editavel ? (
        <SectionCard title="Lançamento mensal por loja" description="Se o mês da loja já tiver lançamento, ele é substituído. Só as contagens ficam gravadas: turnover e absenteísmo são calculados quando aparecem.">
          <FormularioMes
            slug={slug}
            lojas={lojas}
            mesAtual={mesAtual}
            mensais={mensais}
            colaboradores={colaboradores}
            pendente={pendente}
            iniciar={iniciar}
            aoSalvar={(m) => {
              setMsg(m);
              if (m.tipo === "success") router.refresh();
            }}
          />
        </SectionCard>
      ) : (
        <FeedbackMessage variant="info">Seu perfil pode consultar turnover e absenteísmo, mas não lançar os meses.</FeedbackMessage>
      )}

      {mensais.length === 0 ? (
        <SectionCard title="Turnover e absenteísmo">
          <p className="text-sm text-muted-foreground">Nenhum mês lançado ainda. Quando houver, as tabelas e os gráficos aparecem aqui e o painel e as metas passam a usar estes números.</p>
        </SectionCard>
      ) : (
        <>
          <SectionCard title="Turnover por loja" description={`% ao mês. Verde até ${nf1.format(LIMITES_TURNOVER[0])}%, amarelo até ${nf1.format(LIMITES_TURNOVER[1])}%, vermelho acima. Últimos ${MESES_NAS_TABELAS} meses com lançamento; a linha "Rede" soma as contagens das lojas antes de calcular.`}>
            <TabelaMatriz matriz={matrizT} limites={LIMITES_TURNOVER} nome={nome} />
          </SectionCard>
          <SectionCard title="Absenteísmo por loja" description={`% ao mês. Verde até ${nf1.format(LIMITES_ABSENTEISMO[0])}%, amarelo até ${nf1.format(LIMITES_ABSENTEISMO[1])}%, vermelho acima.`}>
            <TabelaMatriz matriz={matrizA} limites={LIMITES_ABSENTEISMO} nome={nome} />
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Histórico de turnover" description="Rede em destaque.">
              <GraficoMatriz matriz={matrizT} nome={nome} descricao="Turnover mensal por loja e da rede." />
            </SectionCard>
            <SectionCard title="Histórico de absenteísmo">
              <GraficoMatriz matriz={matrizA} nome={nome} descricao="Absenteísmo mensal por loja e da rede." />
            </SectionCard>
          </div>

          <SectionCard title="Lançamentos" description={`${mensais.length} ${mensais.length === 1 ? "lançamento" : "lançamentos"}, do mais recente ao mais antigo.`}>
            <div className="mb-3">
              <AcoesExportar arquivo="turnover-absenteismo-fat-buddha.csv" linhas={linhasCsvMovimentos(mensais, nome)} />
            </div>
            <div className="max-h-[380px] overflow-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Mês</th>
                    <th className="py-2 pr-3 font-medium">Loja</th>
                    <th className="py-2 pr-3 text-right font-medium">Headcount</th>
                    <th className="py-2 pr-3 text-right font-medium">Admissões</th>
                    <th className="py-2 pr-3 text-right font-medium">Desligamentos</th>
                    <th className="py-2 pr-3 text-right font-medium">Dias de falta</th>
                    <th className="py-2 pr-3 text-right font-medium">Turnover</th>
                    <th className="py-2 pr-3 text-right font-medium">Absenteísmo</th>
                    {editavel ? <th className="py-2 text-right font-medium">Ações</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {mensais.map((r) => {
                    const t = turnoverPct(r);
                    const a = absenteismoPct(r);
                    return (
                      <tr key={r.id} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-3 tabular-nums">{mesTxt(r.mes)}</td>
                        <td className="py-2 pr-3 font-medium">
                          {nome(r.lojaId)}
                          {r.origem === "exemplo" ? <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">EXEMPLO</span> : null}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{nf1.format(r.headcount)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.admissoes}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.desligamentos}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {r.faltas}
                          <span className="text-muted-foreground"> / {r.diasPrevistos}</span>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{t == null ? "—" : `${nf1.format(t)}%`}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{a == null ? "—" : `${nf1.format(a)}%`}</td>
                        {editavel ? (
                          <td className="py-1 text-right">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Excluir o lançamento de ${mesTxt(r.mes)} de ${nome(r.lojaId)}`} onClick={() => { setErroExcluir(null); setExcluir(r); }}>
                              <Trash2 aria-hidden />
                            </Button>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}

      <ConfirmDialog
        open={excluir != null}
        onOpenChange={(o) => !o && setExcluir(null)}
        title="Excluir este lançamento?"
        description={excluir ? `${nome(excluir.lojaId)} · ${mesTxt(excluir.mes)}. O turnover e o absenteísmo deste mês deixam de aparecer no painel e nas metas. A exclusão fica registrada no histórico de alterações.` : ""}
        confirmLabel="Excluir"
        loading={pendente}
        error={erroExcluir}
        onConfirm={confirmarExclusao}
      />
    </div>
  );
}

/* ============================================================ tabelas e gráficos */

function TabelaMatriz({ matriz, limites, nome }: { matriz: MatrizRh; limites: readonly [number, number]; nome: (id: string) => string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Loja</th>
            {matriz.meses.map((m) => (
              <th key={m} className="py-2 pr-3 text-right font-medium">
                {mesTxt(m)}
              </th>
            ))}
            <th className="py-2 text-right font-medium">Média</th>
          </tr>
        </thead>
        <tbody>
          {matriz.linhas.map((l) => (
            <tr key={l.lojaId ?? "rede"} className={l.lojaId == null ? "border-b border-border/60 bg-muted/40 last:border-0" : "border-b border-border/60 last:border-0"}>
              <td className="py-2 pr-3 font-medium">{l.lojaId == null ? "Rede" : nome(l.lojaId)}</td>
              {l.valores.map((v, i) => (
                <td key={matriz.meses[i]} className="py-2 pr-3 text-right">
                  {v == null ? <span className="text-muted-foreground">—</span> : <StatusPill status={semaforo(v, limites)} className="min-w-14 justify-center">{nf1.format(v)}%</StatusPill>}
                </td>
              ))}
              <td className="py-2 text-right font-semibold tabular-nums">{l.media == null ? "—" : `${nf1.format(l.media)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GraficoMatriz({ matriz, nome, descricao }: { matriz: MatrizRh; nome: (id: string) => string; descricao: string }) {
  const config = useMemo(
    () => (c: Cores) =>
      ({
        type: "line",
        data: {
          labels: matriz.meses.map(mesTxt),
          datasets: matriz.linhas.map((l, i) => ({
            label: l.lojaId == null ? "Rede" : nome(l.lojaId),
            data: l.valores,
            borderColor: l.lojaId == null ? c.texto : PALETA[i % PALETA.length],
            backgroundColor: l.lojaId == null ? c.texto : PALETA[i % PALETA.length],
            borderWidth: l.lojaId == null ? 3 : 1.6,
            pointRadius: l.lojaId == null ? 4 : 3,
            tension: 0.35,
            spanGaps: true,
          })),
        },
        options: {
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: c.texto, usePointStyle: true, boxWidth: 8 } },
            tooltip: { callbacks: { label: (x: { dataset: { label?: string }; parsed: { y: number | null } }) => ` ${x.dataset.label}: ${x.parsed.y == null ? "—" : `${nf1.format(x.parsed.y)}%`}` } },
          },
          scales: {
            y: { grid: { color: c.grade }, border: { display: false }, ticks: { color: c.texto, callback: (v: string | number) => `${nf1.format(Number(v))}%` }, beginAtZero: true },
            x: { grid: { display: false }, border: { display: false }, ticks: { color: c.texto, maxRotation: 0, autoSkip: true } },
          },
        },
      }) as unknown as ChartConfiguration,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matriz],
  );
  return <Grafico config={config} altura={260} descricao={descricao} />;
}

/* ============================================================ formulário */

const txt = (n: number) => String(n).replace(".", ",");

type FormProps = {
  slug: string;
  lojas: LojaRef[];
  mesAtual: string;
  mensais: MesRh[];
  colaboradores: ColaboradorRh[] | null;
  pendente: boolean;
  iniciar: (fn: () => void) => void;
  aoSalvar: (m: NonNullable<Msg>) => void;
};

type Campos = { hc: string; ad: string; de: string; fa: string; pr: string; nota: string | null };

/** Números do mês: o lançamento atual (se houver) ou a sugestão do cadastro; senão em branco. */
function camposDoMes(mensais: MesRh[], colaboradores: ColaboradorRh[] | null, lojaId: string, mes: string, ignorarExistente: boolean): Campos {
  const ja = ignorarExistente ? undefined : mensais.find((r) => r.lojaId === lojaId && r.mes === `${mes}-01`);
  if (ja) return { hc: txt(ja.headcount), ad: String(ja.admissoes), de: String(ja.desligamentos), fa: String(ja.faltas), pr: String(ja.diasPrevistos), nota: "Valores do lançamento atual deste mês." };
  const s = colaboradores && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? sugerirMes(colaboradores, lojaId, mes) : null;
  if (s) return { hc: txt(s.headcount), ad: String(s.admissoes), de: String(s.desligamentos), fa: "0", pr: String(s.diasPrevistos), nota: "Sugerido pelo cadastro de colaboradores (confira e ajuste). Os dias de falta você informa." };
  return { hc: "", ad: "0", de: "0", fa: "0", pr: "", nota: null };
}

function FormularioMes({ slug, lojas, mesAtual, mensais, colaboradores, pendente, iniciar, aoSalvar }: FormProps) {
  const [lojaId, setLojaId] = useState(lojas[0]?.id ?? "");
  const [mes, setMes] = useState(mesAtual);
  const [c, setC] = useState<Campos>(() => camposDoMes(mensais, colaboradores, lojas[0]?.id ?? "", mesAtual, false));

  const existente = useMemo(() => mensais.find((r) => r.lojaId === lojaId && r.mes === `${mes}-01`) ?? null, [mensais, lojaId, mes]);

  const hcNum = c.hc.trim() === "" ? null : lerNumero(c.hc);
  const adNum = Number(c.ad === "" ? 0 : c.ad);
  const deNum = Number(c.de === "" ? 0 : c.de);
  const faNum = Number(c.fa === "" ? 0 : c.fa);
  const prNum = c.pr.trim() === "" ? null : Number(c.pr);
  const previa = {
    t: hcNum != null && hcNum > 0 && Number.isFinite(adNum) && Number.isFinite(deNum) ? turnoverPct({ headcount: hcNum, admissoes: adNum, desligamentos: deNum }) : null,
    a: prNum != null && prNum > 0 && Number.isFinite(faNum) ? absenteismoPct({ faltas: faNum, diasPrevistos: prNum }) : null,
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (hcNum == null || prNum == null || ![adNum, deNum, faNum, prNum].every((n) => Number.isInteger(n))) {
      aoSalvar({ tipo: "error", texto: "Preencha o headcount médio e os dias previstos. Admissões, desligamentos e faltas são números inteiros." });
      return;
    }
    iniciar(async () => {
      const r = await salvarMesAction(slug, { lojaId, mes, headcount: hcNum, admissoes: adNum, desligamentos: deNum, faltas: faNum, diasPrevistos: prNum });
      if (r.success) aoSalvar({ tipo: "success", texto: r.substituido ? "Mês salvo: o lançamento anterior deste mês foi substituído." : "Mês salvo." });
      else aoSalvar({ tipo: "error", texto: r.error });
    });
  };

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <div className="space-y-1">
          <Label htmlFor="mv-loja">Loja</Label>
          <NativeSelect id="mv-loja" value={lojaId} onChange={(e) => { setLojaId(e.target.value); setC(camposDoMes(mensais, colaboradores, e.target.value, mes, false)); }}>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="mv-mes">Mês</Label>
          <Input id="mv-mes" type="month" min="2020-01" max={mesAtual} value={mes} onChange={(e) => { setMes(e.target.value); setC(camposDoMes(mensais, colaboradores, lojaId, e.target.value, false)); }} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mv-hc">Headcount médio</Label>
          <Input
            id="mv-hc"
            inputMode="decimal"
            value={c.hc}
            onChange={(e) => {
              const n = lerNumero(e.target.value);
              setC((v) => ({ ...v, hc: e.target.value, pr: n != null && n > 0 ? String(Math.round(n * DIAS_PREVISTOS_POR_PESSOA)) : v.pr }));
            }}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mv-ad">Admissões</Label>
          <Input id="mv-ad" type="number" inputMode="numeric" min={0} step={1} value={c.ad} onChange={(e) => setC((v) => ({ ...v, ad: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mv-de">Desligamentos</Label>
          <Input id="mv-de" type="number" inputMode="numeric" min={0} step={1} value={c.de} onChange={(e) => setC((v) => ({ ...v, de: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mv-fa">Dias de falta</Label>
          <Input id="mv-fa" type="number" inputMode="numeric" min={0} step={1} value={c.fa} onChange={(e) => setC((v) => ({ ...v, fa: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mv-pr">Dias previstos</Label>
          <Input id="mv-pr" type="number" inputMode="numeric" min={1} step={1} value={c.pr} onChange={(e) => setC((v) => ({ ...v, pr: e.target.value }))} placeholder={`headcount × ${DIAS_PREVISTOS_POR_PESSOA}`} required />
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <p className="text-muted-foreground">Turnover = ((admissões + desligamentos) ÷ 2) ÷ headcount médio · Absenteísmo = dias de falta ÷ dias previstos</p>
        {previa.t != null || previa.a != null ? (
          <p className="flex flex-wrap items-center gap-2">
            {previa.t != null ? <StatusPill status={semaforo(previa.t, LIMITES_TURNOVER)}>Turnover {nf1.format(previa.t)}%</StatusPill> : null}
            {previa.a != null ? <StatusPill status={semaforo(previa.a, LIMITES_ABSENTEISMO)}>Absenteísmo {nf1.format(previa.a)}%</StatusPill> : null}
          </p>
        ) : null}
        {c.nota ? <p className="text-xs text-muted-foreground">{c.nota}</p> : null}
        {existente ? <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Este mês já tem lançamento nesta loja. Salvar substitui os números.</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pendente || lojas.length === 0}>
          {pendente ? "Salvando…" : existente ? "Substituir mês" : "Salvar mês"}
        </Button>
        {colaboradores ? (
          <Button type="button" variant="outline" disabled={pendente} onClick={() => setC(camposDoMes(mensais, colaboradores, lojaId, mes, true))}>
            Preencher do cadastro
          </Button>
        ) : null}
      </div>
    </form>
  );
}
