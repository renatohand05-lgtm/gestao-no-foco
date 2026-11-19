"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { ChartConfiguration } from "chart.js";

import { Grafico } from "@/components/painel-recorrencia/grafico";
import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { KpiCard } from "@/components/rede/kpi-card";
import { StatusPill } from "@/components/rede/status";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SectionCard } from "@/components/ui/section-card";
import { excluirLiderancaAction, salvarLiderancaAction } from "@/lib/rede/actions-talentos";
import type { LinhaGerente, PontoEvolucao, ResumoGerentes } from "@/lib/rede/gerentes";
import { formatarNota } from "@/lib/rede/qualidade";
import { textoTempoDeCasa } from "@/lib/rede/rh";
import {
  faixaDoScore,
  formatarScore,
  lerNotaLideranca,
  LIDERANCA_MAXIMA,
  linhasCsvGerentes,
  PESOS_GERENTE,
  PESO_MINIMO_SCORE,
  type CriterioGerente,
  type FaixaScore,
} from "@/lib/rede/talentos";

type Msg = { tipo: "success" | "error"; texto: string } | null;
type Cores = { texto: string; grade: string };

export type DadosGerentesTela = {
  mes: string;
  mesesSeletor: string[];
  mesesEvolucao: string[];
  linhas: LinhaGerente[];
  evolucao: PontoEvolucao[];
  resumo: ResumoGerentes;
  semAcesso: string[];
};

const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const PALETA = ["#e5303f", "#f2b33d", "#3fc58e", "#3b82f6", "#a855f7", "#14b8a6"];
const COR_FAIXA: Record<FaixaScore, string> = { otimo: "#10b981", bom: "#3b82f6", atencao: "#f59e0b", critico: "#ef4444" };
const CLASSE_FAIXA: Record<FaixaScore, string> = {
  otimo: "text-emerald-600 dark:text-emerald-400",
  bom: "text-blue-600 dark:text-blue-400",
  atencao: "text-amber-600 dark:text-amber-400",
  critico: "text-red-600 dark:text-red-400",
};
const TOM_FAIXA = { otimo: "ok", bom: "ok", atencao: "atencao", critico: "critico" } as const;
const NOME_MES = (mes: string) => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${mes}-01T12:00:00Z`));
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const mesCurto = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`;
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const ROTULO_CRITERIO: Record<CriterioGerente, string> = { vendas: "Vendas", indicadores: "Indicadores", qualidade: "Qualidade", pessoas: "Pessoas", lideranca: "Liderança" };

type Props = {
  slug: string;
  basePath: string;
  lojaSlug: string | null;
  dados: DadosGerentesTela;
  editavel: boolean;
};

export function RhGerentes({ slug, basePath, lojaSlug, dados, editavel }: Props) {
  const router = useRouter();
  const [navegando, navegar] = useTransition();
  const [selId, setSelId] = useState<string | null>(null);
  const { linhas, mes } = dados;

  const nomeLoja = useMemo(() => new Map(linhas.map((l) => [l.lojaId, l.loja.nome] as const)), [linhas]);
  const nome = (id: string) => nomeLoja.get(id) ?? "Loja";
  const avaliadas = linhas.filter((l) => l.situacao === "avaliada");
  const sel = avaliadas.find((l) => l.lojaId === selId) ?? avaliadas.find((l) => l.score != null) ?? avaliadas[0] ?? null;

  const irParaMes = (novo: string) => {
    const p = new URLSearchParams({ aba: "gerentes", mes: novo });
    if (lojaSlug) p.set("loja", lojaSlug);
    navegar(() => router.push(`${basePath}?${p.toString()}`));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-card p-3 print:hidden" aria-busy={navegando}>
        <div className="min-w-56 space-y-1">
          <Label htmlFor="ger-mes">Período avaliado</Label>
          <NativeSelect id="ger-mes" value={mes} onChange={(e) => irParaMes(e.target.value)}>
            {dados.mesesSeletor.map((m) => (
              <option key={m} value={m}>
                {NOME_MES(m)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <p className="max-w-xl text-xs text-muted-foreground">
          O score reúne vendas, indicadores, qualidade, pessoas e liderança do mês. Critério sem dado fica de fora e o peso dele é redistribuído entre os demais: nenhuma nota é inventada.
        </p>
      </div>

      {dados.semAcesso.length > 0 ? <FeedbackMessage variant="info">{`Seu perfil não enxerga: ${dados.semAcesso.join(", ")}. Esses critérios ficam de fora do score.`}</FeedbackMessage> : null}

      <section aria-label="Resumo da avaliação" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          rotulo="Gerentes avaliados"
          valor={nf0.format(dados.resumo.avaliados)}
          detalhe={dados.resumo.semScore > 0 ? `${dados.resumo.semScore} sem dados suficientes` : `${NOME_MES(mes)}`}
        />
        <KpiCard
          rotulo="Score médio"
          valor={dados.resumo.scoreMedio == null ? "—" : formatarScore(dados.resumo.scoreMedio)}
          detalhe="de 100 · só quem tem score"
          tom={dados.resumo.scoreMedio == null ? "neutro" : TOM_FAIXA[faixaDoScore(dados.resumo.scoreMedio)]}
        />
        <KpiCard rotulo="Prontos para promoção" valor={nf0.format(dados.resumo.prontosParaPromocao)} detalhe="score alto e potencial alto" tom={dados.resumo.prontosParaPromocao > 0 ? "ok" : "neutro"} />
        <KpiCard rotulo="Em plano de melhoria" valor={nf0.format(dados.resumo.emMelhoria)} detalhe="score abaixo de 55" tom={dados.resumo.emMelhoria > 0 ? "critico" : "neutro"} />
      </section>

      <SectionCard title="Score dos gerentes" description="Escolha um gerente para ver o detalhe. A posição é pelo score; quem não tem dados suficientes fica sem posição.">
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma loja para avaliar.</p>
        ) : (
          <>
            <div className="mb-3">
              <AcoesExportar arquivo={`gerentes-${mes}-fat-buddha.csv`} linhas={linhasCsvGerentes(linhas, nome, NOME_MES(mes))} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">#</th>
                    <th className="py-2 pr-3 font-medium">Gerente</th>
                    <th className="py-2 pr-3 font-medium">Loja</th>
                    <th className="py-2 pr-3 font-medium">Tempo de casa</th>
                    <th className="py-2 pr-3 text-right font-medium">Vendas x meta</th>
                    <th className="py-2 pr-3 text-right font-medium">Indicadores</th>
                    <th className="py-2 pr-3 text-right font-medium">Qualidade</th>
                    <th className="py-2 pr-3 text-right font-medium">Turnover</th>
                    <th className="py-2 pr-3 text-right font-medium">Liderança</th>
                    <th className="py-2 pr-3 font-medium">Nine box</th>
                    <th className="py-2 pr-3 text-right font-medium">Score</th>
                    <th className="py-2 font-medium">Recomendação</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <LinhaTabela key={l.lojaId} l={l} selecionada={sel?.lojaId === l.lojaId} aoEscolher={() => setSelId(l.lojaId)} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>

      {sel ? <Detalhe key={`${sel.lojaId}-${mes}`} slug={slug} l={sel} mes={mes} editavel={editavel} /> : <SectionCard title="Detalhe"><p className="text-sm text-muted-foreground">Sem gerente com resultados nesta seleção.</p></SectionCard>}

      {avaliadas.some((l) => l.score != null) ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Ranking de gerentes" description={`Score de ${NOME_MES(mes)}.`}>
            <GraficoRanking linhas={linhas} />
          </SectionCard>
          <SectionCard title="Evolução do score" description={`Últimos ${dados.mesesEvolucao.length} meses até ${NOME_MES(mes)}. A linha "Rede" é a média de quem tem score no mês.`}>
            <GraficoEvolucao evolucao={dados.evolucao} nome={nome} />
          </SectionCard>
        </div>
      ) : null}

      <SectionCard title="Histórico do score" description="Mês a mês, com o mesmo cálculo. Mês sem gerente no cargo, sem loja operando ou sem dados suficientes aparece com traço.">
        <TabelaEvolucao evolucao={dados.evolucao} linhas={linhas} nome={nome} />
      </SectionCard>
    </div>
  );
}

/* ============================================================ tabela */

function LinhaTabela({ l, selecionada, aoEscolher }: { l: LinhaGerente; selecionada: boolean; aoEscolher: () => void }) {
  const nomeGerente = l.gerente?.nome ?? "Sem gerente cadastrado";
  const base = "border-b border-border/60 last:border-0";
  if (l.situacao === "inauguracao") {
    return (
      <tr className={base}>
        <td className="py-2 pr-3 text-muted-foreground">—</td>
        <td className="py-2 pr-3 font-medium">{nomeGerente}</td>
        <td className="py-2 pr-3">{l.loja.nome}</td>
        <td className="py-2 pr-3">{l.casaMeses == null ? "—" : textoTempoDeCasa(l.casaMeses)}</td>
        <td colSpan={5} className="py-2 pr-3 text-muted-foreground">
          Loja em inauguração — avaliação a partir do 1º mês
        </td>
        <td className="py-2 pr-3">{l.quadranteNineBox ?? "—"}</td>
        <td className="py-2 pr-3 text-right text-muted-foreground">—</td>
        <td className="py-2 text-muted-foreground">—</td>
      </tr>
    );
  }
  if (l.situacao === "sem_gerente") {
    return (
      <tr className={base}>
        <td className="py-2 pr-3 text-muted-foreground">—</td>
        <td className="py-2 pr-3 text-muted-foreground">Sem gerente de loja neste mês</td>
        <td className="py-2 pr-3">{l.loja.nome}</td>
        <td colSpan={9} className="py-2 text-muted-foreground">
          Cadastre o gerente em Quadro de pessoal (cargo &quot;Gerente de loja&quot;) para avaliar.
        </td>
      </tr>
    );
  }
  return (
    <tr className={selecionada ? `${base} bg-muted/50` : base}>
      <td className="py-2 pr-3 tabular-nums">{l.posicao ?? "—"}</td>
      <td className="py-2 pr-3 font-medium">
        <button type="button" onClick={aoEscolher} aria-pressed={selecionada} className="rounded text-left underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">
          {nomeGerente}
        </button>
        {l.gerente?.origem === "exemplo" ? <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">EXEMPLO</span> : null}
      </td>
      <td className="py-2 pr-3">{l.loja.nome}</td>
      <td className="py-2 pr-3">{l.casaMeses == null ? "—" : textoTempoDeCasa(l.casaMeses)}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{l.pctMeta == null ? "—" : `${nf0.format(l.pctMeta)}%`}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{l.indAvaliados > 0 ? `${l.indOk}/${l.indAvaliados}` : "—"}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{formatarNota(l.qualidade)}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{l.turnover == null ? "—" : `${nf1.format(l.turnover)}%`}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{l.lideranca == null ? "—" : nf1.format(l.lideranca)}</td>
      <td className="py-2 pr-3">{l.quadranteNineBox ?? <span className="text-muted-foreground">sem avaliação</span>}</td>
      <td className="py-2 pr-3 text-right">
        {l.score == null ? (
          <span className="text-muted-foreground" title="Poucos critérios com dado neste mês">
            —
          </span>
        ) : (
          <b className={`tabular-nums ${CLASSE_FAIXA[faixaDoScore(l.score)]}`}>{formatarScore(l.score)}</b>
        )}
      </td>
      <td className="py-2">{l.rec ? <StatusPill status={l.rec.tom}>{l.rec.rotulo}</StatusPill> : <span className="text-muted-foreground">Dados insuficientes</span>}</td>
    </tr>
  );
}

/* ============================================================ detalhe do gerente */

function Detalhe({ slug, l, mes, editavel }: { slug: string; l: LinhaGerente; mes: string; editavel: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [nota, setNota] = useState(l.lideranca == null ? "" : String(l.lideranca).replace(".", ","));
  const [obs, setObs] = useState(l.registroLideranca?.observacoes ?? "");
  const [excluir, setExcluir] = useState(false);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  const presentes = PESOS_GERENTE.filter((w) => l.comp[w.k] != null);
  const notaNum = lerNotaLideranca(nota);
  const notaOk = notaNum != null && notaNum >= 0 && notaNum <= LIDERANCA_MAXIMA && Math.abs(notaNum * 10 - Math.round(notaNum * 10)) < 1e-6;

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!l.gerente) return;
    if (!notaOk || notaNum == null) {
      setMsg({ tipo: "error", texto: `Informe a nota de liderança de 0 a ${LIDERANCA_MAXIMA}, com no máximo uma casa decimal.` });
      return;
    }
    const gerenteId = l.gerente.id;
    iniciar(async () => {
      const r = await salvarLiderancaAction(slug, { lojaId: l.lojaId, colaboradorId: gerenteId, mes, nota: notaNum, observacoes: obs.trim() === "" ? null : obs.trim() });
      if (r.success) {
        setMsg({ tipo: "success", texto: r.substituido ? "Nota de liderança atualizada." : "Nota de liderança salva." });
        router.refresh();
      } else setMsg({ tipo: "error", texto: r.error });
    });
  };

  const confirmarExclusao = () => {
    const registro = l.registroLideranca;
    if (!registro) return;
    setErroExcluir(null);
    iniciar(async () => {
      const r = await excluirLiderancaAction(slug, registro.id);
      if (r.success) {
        setExcluir(false);
        setNota("");
        setObs("");
        setMsg({ tipo: "success", texto: "Nota de liderança excluída. O critério sai do score e o peso dele é redistribuído." });
        router.refresh();
      } else setErroExcluir(r.error);
    });
  };

  return (
    <SectionCard title={`${l.gerente?.nome ?? "Gerente"} · ${l.loja.nome}`} description={`Detalhe de ${NOME_MES(mes)}`}>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          {l.score == null ? (
            <FeedbackMessage variant="info">{`Poucos critérios com dado neste mês (${l.criterios} de ${PESOS_GERENTE.length}, ${l.pesoUsado}% do peso). O score só é calculado a partir de ${PESO_MINIMO_SCORE}% do peso, para não virar a nota de um ou dois critérios.`}</FeedbackMessage>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <span className="text-xs text-muted-foreground">Score geral</span>
                <p className={`text-2xl font-semibold tabular-nums ${CLASSE_FAIXA[faixaDoScore(l.score)]}`}>
                  {formatarScore(l.score)} <span className="text-sm font-normal text-muted-foreground">de 100</span>
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <span className="text-xs text-muted-foreground">Recomendação</span>
                <p className="mt-1">{l.rec ? <StatusPill status={l.rec.tom}>{l.rec.rotulo}</StatusPill> : null}</p>
              </div>
            </div>
          )}
          {l.rec ? <p className="text-sm text-muted-foreground">{l.rec.texto}</p> : null}

          <div>
            <h4 className="mb-2 text-sm font-medium">Critérios do score</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Critério</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Peso</th>
                  <th className="py-1.5 text-right font-medium">Nota (0–100)</th>
                </tr>
              </thead>
              <tbody>
                {PESOS_GERENTE.map((w) => {
                  const v = l.comp[w.k];
                  return (
                    <tr key={w.k} className="border-b border-border/60 last:border-0">
                      <td className="py-1.5 pr-3">{w.nome}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{w.peso}%</td>
                      <td className="py-1.5 text-right tabular-nums">{v == null ? <span className="text-muted-foreground">sem dado</span> : nf0.format(v)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">
              Considerados: {l.criterios} de {PESOS_GERENTE.length} critérios ({l.pesoUsado}% do peso).
              {l.ausentes.length > 0 ? ` Sem dado neste mês: ${l.ausentes.map((k) => ROTULO_CRITERIO[k].toLowerCase()).join(", ")} — o peso foi redistribuído.` : ""}
              {l.qualidadeData ? ` Qualidade: visita de ${dmy(l.qualidadeData)}.` : l.ausentes.includes("qualidade") ? " A nota de qualidade entra quando houver uma visita salva para esta loja." : ""}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {presentes.length >= 3 ? <GraficoRadar l={l} /> : <p className="text-sm text-muted-foreground">O gráfico de radar aparece quando há pelo menos 3 critérios com dado.</p>}

          {editavel && l.gerente ? (
            <form onSubmit={salvar} className="space-y-3 rounded-lg border border-border p-3">
              <h4 className="text-sm font-medium">Nota de liderança de {NOME_MES(mes)}</h4>
              <p className="text-xs text-muted-foreground">De 0 a {LIDERANCA_MAXIMA}, lançada por quem avalia o gerente. É o único critério do score que se digita; os demais vêm dos outros módulos.</p>
              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <div className="space-y-1">
                  <Label htmlFor="ger-nota">Nota (0 a {LIDERANCA_MAXIMA})</Label>
                  <Input id="ger-nota" inputMode="decimal" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="ex.: 4,5" aria-invalid={nota.trim() !== "" && !notaOk} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ger-obs">Observação (opcional)</Label>
                  <Input id="ger-obs" value={obs} maxLength={500} onChange={(e) => setObs(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={pendente}>
                  {pendente ? "Salvando…" : l.registroLideranca ? "Atualizar nota" : "Salvar nota"}
                </Button>
                {l.registroLideranca ? (
                  <Button type="button" variant="outline" disabled={pendente} onClick={() => { setErroExcluir(null); setExcluir(true); }}>
                    <Trash2 aria-hidden /> Excluir nota
                  </Button>
                ) : null}
              </div>
              {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}
            </form>
          ) : !editavel ? (
            <FeedbackMessage variant="info">Seu perfil pode consultar a avaliação, mas não lançar a nota de liderança.</FeedbackMessage>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={excluir}
        onOpenChange={(o) => !o && setExcluir(false)}
        title="Excluir a nota de liderança?"
        description={`${l.gerente?.nome ?? "Gerente"} · ${NOME_MES(mes)}. O critério Liderança deixa de contar neste mês e o peso dele é redistribuído entre os demais. A exclusão fica registrada no histórico de alterações.`}
        confirmLabel="Excluir"
        loading={pendente}
        error={erroExcluir}
        onConfirm={confirmarExclusao}
      />
    </SectionCard>
  );
}

/* ============================================================ gráficos */

function GraficoRadar({ l }: { l: LinhaGerente }) {
  const config = useMemo(() => {
    const itens = PESOS_GERENTE.filter((w) => l.comp[w.k] != null);
    return (c: Cores) =>
      ({
        type: "radar",
        data: {
          labels: itens.map((w) => ROTULO_CRITERIO[w.k]),
          datasets: [{ label: "Nota", data: itens.map((w) => l.comp[w.k]), borderColor: "#e5303f", backgroundColor: "rgba(229,48,63,.25)", pointBackgroundColor: "#f2b33d", borderWidth: 2 }],
        },
        options: {
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { r: { min: 0, max: 100, ticks: { display: false, stepSize: 25 }, grid: { color: c.grade }, angleLines: { color: c.grade }, pointLabels: { color: c.texto, font: { size: 12 } } } },
        },
      }) as unknown as ChartConfiguration;
  }, [l]);
  const descricao = `Radar do score de ${l.gerente?.nome ?? "gerente"}: ${PESOS_GERENTE.filter((w) => l.comp[w.k] != null)
    .map((w) => `${ROTULO_CRITERIO[w.k]} ${nf0.format(l.comp[w.k] as number)}`)
    .join(", ")}.`;
  return <Grafico config={config} altura={260} descricao={descricao} />;
}

function GraficoRanking({ linhas }: { linhas: LinhaGerente[] }) {
  const itens = linhas.filter((l) => l.score != null).sort((a, b) => (a.posicao ?? 99) - (b.posicao ?? 99));
  const config = useMemo(
    () => (c: Cores) =>
      ({
        type: "bar",
        data: {
          labels: itens.map((l) => `${l.gerente?.nome ?? l.loja.nome} · ${l.loja.nome}`),
          datasets: [{ label: "Score", data: itens.map((l) => l.score), backgroundColor: itens.map((l) => COR_FAIXA[faixaDoScore(l.score as number)]), borderRadius: 4 }],
        },
        options: {
          indexAxis: "y",
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (x: { parsed: { x: number | null } }) => ` Score: ${formatarScore(x.parsed.x)}` } } },
          scales: {
            x: { min: 0, max: 100, grid: { color: c.grade }, border: { display: false }, ticks: { color: c.texto } },
            y: { grid: { display: false }, border: { display: false }, ticks: { color: c.texto } },
          },
        },
      }) as unknown as ChartConfiguration,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [linhas],
  );
  return <Grafico config={config} altura={Math.max(180, itens.length * 46 + 40)} descricao={`Ranking: ${itens.map((l) => `${l.gerente?.nome ?? l.loja.nome} ${formatarScore(l.score)}`).join(", ")}.`} />;
}

function GraficoEvolucao({ evolucao, nome }: { evolucao: PontoEvolucao[]; nome: (id: string) => string }) {
  const lojaIds = [...new Set(evolucao.flatMap((p) => p.scores.filter((s) => s.score != null).map((s) => s.lojaId)))];
  const config = useMemo(
    () => (c: Cores) =>
      ({
        type: "line",
        data: {
          labels: evolucao.map((p) => mesCurto(p.mes)),
          datasets: [
            ...lojaIds.map((id, i) => ({
              label: nome(id),
              data: evolucao.map((p) => p.scores.find((s) => s.lojaId === id)?.score ?? null),
              borderColor: PALETA[i % PALETA.length],
              backgroundColor: PALETA[i % PALETA.length],
              borderWidth: 1.6,
              pointRadius: 3,
              tension: 0.35,
              spanGaps: false,
            })),
            { label: "Rede", data: evolucao.map((p) => p.media), borderColor: c.texto, backgroundColor: c.texto, borderWidth: 3, pointRadius: 4, tension: 0.35, spanGaps: false },
          ],
        },
        options: {
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: c.texto, usePointStyle: true, boxWidth: 8 } },
            tooltip: { callbacks: { label: (x: { dataset: { label?: string }; parsed: { y: number | null } }) => ` ${x.dataset.label}: ${x.parsed.y == null ? "—" : formatarScore(x.parsed.y)}` } },
          },
          scales: {
            y: { min: 0, max: 100, grid: { color: c.grade }, border: { display: false }, ticks: { color: c.texto } },
            x: { grid: { display: false }, border: { display: false }, ticks: { color: c.texto, maxRotation: 0 } },
          },
        },
      }) as unknown as ChartConfiguration,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [evolucao],
  );
  return <Grafico config={config} altura={260} descricao="Evolução mensal do score dos gerentes por loja e da rede." />;
}

function TabelaEvolucao({ evolucao, linhas, nome }: { evolucao: PontoEvolucao[]; linhas: LinhaGerente[]; nome: (id: string) => string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Loja</th>
            {evolucao.map((p) => (
              <th key={p.mes} className="py-2 pr-3 text-right font-medium">
                {mesCurto(p.mes)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.lojaId} className="border-b border-border/60 last:border-0">
              <td className="py-2 pr-3 font-medium">{nome(l.lojaId)}</td>
              {evolucao.map((p) => {
                const s = p.scores.find((x) => x.lojaId === l.lojaId)?.score ?? null;
                return (
                  <td key={p.mes} className="py-2 pr-3 text-right tabular-nums">
                    {s == null ? <span className="text-muted-foreground">—</span> : <b className={CLASSE_FAIXA[faixaDoScore(s)]}>{formatarScore(s)}</b>}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="bg-muted/40">
            <td className="py-2 pr-3 font-medium">Rede (média)</td>
            {evolucao.map((p) => (
              <td key={p.mes} className="py-2 pr-3 text-right font-semibold tabular-nums">
                {p.media == null ? <span className="text-muted-foreground">—</span> : formatarScore(p.media)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
