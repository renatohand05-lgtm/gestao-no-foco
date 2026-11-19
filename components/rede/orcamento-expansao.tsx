"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { TabelaDre } from "@/components/rede/dre-tabelas";
import { KpiCard } from "@/components/rede/kpi-card";
import { ImpactoGrafico } from "@/components/rede/orcamento-graficos";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SectionCard } from "@/components/ui/section-card";
import { excluirUnidadeAction, salvarConfigExpansaoAction, salvarUnidadeAction } from "@/lib/rede/actions-financeiro";
import { brl, mesDe, pct1 } from "@/lib/rede/calculo";
import { lerNumero } from "@/lib/rede/csv";
import { calcularUnidades, consolidarDre, descreverNovas, impactoMensal, orcDre, premissasDoCenario, simularRede, type DreCalc } from "@/lib/rede/financeiro";
import type { Cenario, ConfigExpansao, Loja, StatusUnidade, UnidadeExpansao } from "@/lib/rede/tipos";

type Msg = { tipo: "success" | "error"; texto: string } | null;
const paraTexto = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));
const mesAno = (m: string | null) => (m ? `${m.slice(5, 7)}/${m.slice(0, 4)}` : "sem data");
const STATUS_ROTULO: Record<StatusUnidade, string> = { planejada: "Planejada", inaugurada: "Inaugurada", cancelada: "Cancelada" };
const MESES_NO_IMPACTO = 36;

type Props = {
  slug: string;
  unidades: UnidadeExpansao[];
  cenarios: Cenario[];
  lojas: Loja[];
  config: ConfigExpansao;
  baseDre: { lojaId: string; nome: string; d: DreCalc }[];
  mesRef: string | null;
  hoje: string;
  editavel: boolean;
};

export function OrcamentoExpansao({ slug, unidades, cenarios, lojas, config, baseDre, mesRef, hoje, editavel }: Props) {
  const padrao = cenarios.find((c) => c.padrao) ?? cenarios[0] ?? null;
  const calculadas = useMemo(() => calcularUnidades(unidades, cenarios, padrao), [unidades, cenarios, padrao]);
  const impacto = useMemo(() => impactoMensal(calculadas, mesDe(hoje), MESES_NO_IMPACTO), [calculadas, hoje]);
  return (
    <div className="space-y-5">
      <CalendarioUnidades slug={slug} unidades={unidades} cenarios={cenarios} lojas={lojas} calculadas={calculadas} editavel={editavel} />
      <Impacto pontos={impacto} semUnidades={calculadas.length === 0} />
      <RedeSimulada slug={slug} cenarios={cenarios} lojas={lojas} unidades={unidades} config={config} baseDre={baseDre} mesRef={mesRef} editavel={editavel} />
    </div>
  );
}

/* ============================================================ calendário de inaugurações */

function CalendarioUnidades({ slug, unidades, cenarios, lojas, calculadas, editavel }: { slug: string; unidades: UnidadeExpansao[]; cenarios: Cenario[]; lojas: Loja[]; calculadas: ReturnType<typeof calcularUnidades>; editavel: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [editando, setEditando] = useState<UnidadeExpansao | null>(null);
  const [excluir, setExcluir] = useState<UnidadeExpansao | null>(null);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);
  const nomeCenario = useMemo(() => new Map(cenarios.map((c) => [c.id, c.nome] as const)), [cenarios]);
  const nomeLoja = useMemo(() => new Map(lojas.map((l) => [l.id, l.nome] as const)), [lojas]);
  const calc = useMemo(() => new Map(calculadas.map((c) => [c.unidade.id, c] as const)), [calculadas]);

  const confirmarExclusao = () => {
    if (!excluir) return;
    setErroExcluir(null);
    iniciar(async () => {
      const r = await excluirUnidadeAction(slug, excluir.id);
      if (r.success) {
        setExcluir(null);
        if (editando?.id === excluir.id) setEditando(null);
        setMsg({ tipo: "success", texto: "Unidade excluída." });
        router.refresh();
      } else setErroExcluir(r.error);
    });
  };

  const linhasCsv: (string | number | null)[][] = [
    ["Unidade", "Abertura prevista", "Situação", "Cenário", "Loja vinculada", "Faturamento-alvo (R$)", "Resultado mensal maduro (R$)", "Resultado do 1º ano (R$)", "Observação"],
    ...unidades.map((u) => {
      const c = calc.get(u.id);
      return [u.nome, mesAno(u.aberturaPrevista ? mesDe(u.aberturaPrevista) : null), STATUS_ROTULO[u.status], u.cenarioId ? (nomeCenario.get(u.cenarioId) ?? "") : "(padrão)", u.lojaId ? (nomeLoja.get(u.lojaId) ?? "") : "", c?.premissas.faturamento ?? u.faturamentoAlvo ?? null, c ? Math.round(c.maduro.res * 100) / 100 : null, c ? Math.round(c.primeiroAno * 100) / 100 : null, u.observacao];
    }),
  ];

  return (
    <SectionCard title="Calendário de inaugurações" description="Cada unidade tem uma data prevista (mês), um cenário de orçamento e, se quiser, um faturamento-alvo próprio. A unidade só vira loja de verdade quando você a cadastra em “Lojas e acessos” e a vincula aqui.">
      <div className="space-y-4">
        {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}
        {unidades.length > 0 ? <AcoesExportar arquivo="inauguracoes.csv" linhas={linhasCsv} imprimir={false} /> : null}
        {unidades.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma inauguração cadastrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Unidade</th>
                  <th className="py-2 pr-3 font-medium">Abertura</th>
                  <th className="py-2 pr-3 font-medium">Situação</th>
                  <th className="py-2 pr-3 font-medium">Cenário</th>
                  <th className="py-2 pr-3 text-right font-medium">Fat. alvo</th>
                  <th className="py-2 pr-3 text-right font-medium">Resultado/mês maduro</th>
                  <th className="py-2 pr-3 text-right font-medium">1º ano</th>
                  {editavel ? <th className="py-2 text-right font-medium">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {unidades.map((u) => {
                  const c = calc.get(u.id);
                  return (
                    <tr key={u.id} className={`border-b border-border/60 last:border-0 ${u.status === "cancelada" ? "text-muted-foreground line-through" : ""}`}>
                      <td className="py-2 pr-3 font-medium">
                        {u.nome}
                        {u.lojaId ? <span className="ml-2 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 no-underline dark:text-emerald-400">LOJA: {nomeLoja.get(u.lojaId) ?? "vinculada"}</span> : null}
                        {u.origem === "exemplo" ? <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 no-underline dark:text-amber-400">EXEMPLO</span> : null}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{mesAno(u.aberturaPrevista ? mesDe(u.aberturaPrevista) : null)}</td>
                      <td className="py-2 pr-3">{STATUS_ROTULO[u.status]}</td>
                      <td className="py-2 pr-3">{u.cenarioId ? (nomeCenario.get(u.cenarioId) ?? "—") : "padrão"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{c ? brl(c.premissas.faturamento) : "—"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{c ? brl(c.maduro.res) : "—"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{c ? brl(c.primeiroAno) : "—"}</td>
                      {editavel ? (
                        <td className="py-2 text-right">
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Editar ${u.nome}`} onClick={() => { setEditando(u); setMsg(null); document.getElementById("un-form")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
                            <Pencil aria-hidden />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Excluir ${u.nome}`} onClick={() => { setErroExcluir(null); setExcluir(u); }}>
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
        )}

        {editavel ? (
          <div id="un-form" className="scroll-mt-24 border-t border-border pt-4">
            <p className="mb-3 text-sm font-medium">{editando ? `Editando “${editando.nome}”` : "Nova inauguração"}</p>
            <FormularioUnidade
              key={editando?.id ?? "novo"}
              slug={slug}
              unidade={editando}
              cenarios={cenarios}
              lojas={lojas}
              pendente={pendente}
              iniciar={iniciar}
              aoSalvar={(m) => {
                setMsg(m);
                if (m.tipo === "success") {
                  setEditando(null);
                  router.refresh();
                }
              }}
              aoCancelar={() => setEditando(null)}
            />
          </div>
        ) : (
          <FeedbackMessage variant="info">Seu perfil pode consultar o calendário, mas não alterá-lo.</FeedbackMessage>
        )}
      </div>
      <ConfirmDialog
        open={excluir != null}
        onOpenChange={(o) => !o && setExcluir(null)}
        title="Excluir inauguração?"
        description={excluir ? `“${excluir.nome}” sai do calendário e do impacto mensal. Se ela já virou loja, a loja não é afetada. A exclusão fica registrada no histórico.` : ""}
        confirmLabel="Excluir"
        loading={pendente}
        error={erroExcluir}
        onConfirm={confirmarExclusao}
      />
    </SectionCard>
  );
}

function FormularioUnidade({ slug, unidade, cenarios, lojas, pendente, iniciar, aoSalvar, aoCancelar }: { slug: string; unidade: UnidadeExpansao | null; cenarios: Cenario[]; lojas: Loja[]; pendente: boolean; iniciar: (fn: () => void) => void; aoSalvar: (m: NonNullable<Msg>) => void; aoCancelar: () => void }) {
  const [nome, setNome] = useState(unidade?.nome ?? "");
  const [abertura, setAbertura] = useState(unidade?.aberturaPrevista ? mesDe(unidade.aberturaPrevista) : "");
  const [status, setStatus] = useState<StatusUnidade>(unidade?.status ?? "planejada");
  const [cenarioId, setCenarioId] = useState(unidade?.cenarioId ?? "");
  const [lojaId, setLojaId] = useState(unidade?.lojaId ?? "");
  const [alvo, setAlvo] = useState(paraTexto(unidade?.faturamentoAlvo));
  const [obs, setObs] = useState(unidade?.observacao ?? "");

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const n = alvo.trim() === "" ? null : lerNumero(alvo);
    if (alvo.trim() !== "" && n == null) {
      aoSalvar({ tipo: "error", texto: "Faturamento-alvo: use apenas dígitos, vírgula ou ponto." });
      return;
    }
    iniciar(async () => {
      const r = await salvarUnidadeAction(slug, { id: unidade?.id, nome, abertura: abertura || null, status, cenarioId: cenarioId || null, lojaId: lojaId || null, faturamentoAlvo: n, observacao: obs.trim() || null });
      aoSalvar(r.success ? { tipo: "success", texto: `Unidade “${nome}” salva.` } : { tipo: "error", texto: r.error });
    });
  };

  return (
    <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1">
        <Label htmlFor="un-nome">Nome</Label>
        <Input id="un-nome" maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="un-abertura">Abertura prevista (mês)</Label>
        <Input id="un-abertura" type="month" value={abertura} onChange={(e) => setAbertura(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="un-status">Situação</Label>
        <NativeSelect id="un-status" value={status} onChange={(e) => setStatus(e.target.value as StatusUnidade)}>
          <option value="planejada">Planejada</option>
          <option value="inaugurada">Inaugurada</option>
          <option value="cancelada">Cancelada</option>
        </NativeSelect>
      </div>
      <div className="space-y-1">
        <Label htmlFor="un-cenario">Cenário</Label>
        <NativeSelect id="un-cenario" value={cenarioId} onChange={(e) => setCenarioId(e.target.value)}>
          <option value="">Padrão</option>
          {cenarios.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1">
        <Label htmlFor="un-alvo">Faturamento-alvo (R$, opcional)</Label>
        <Input id="un-alvo" inputMode="decimal" value={alvo} onChange={(e) => setAlvo(e.target.value)} placeholder="vazio = o do cenário" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="un-loja">Loja cadastrada (opcional)</Label>
        <NativeSelect id="un-loja" value={lojaId} onChange={(e) => setLojaId(e.target.value)}>
          <option value="">Ainda não cadastrada</option>
          {lojas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nome}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="un-obs">Observação (opcional)</Label>
        <Input id="un-obs" maxLength={300} value={obs} onChange={(e) => setObs(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-4">
        {unidade ? (
          <Button type="button" variant="outline" onClick={aoCancelar} disabled={pendente}>
            Cancelar edição
          </Button>
        ) : null}
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : unidade ? "Salvar alterações" : "Adicionar inauguração"}
        </Button>
      </div>
    </form>
  );
}

/* ============================================================ impacto mensal */

function Impacto({ pontos, semUnidades }: { pontos: ReturnType<typeof impactoMensal>; semUnidades: boolean }) {
  const soma = (n: number) => pontos.slice(0, n).reduce((a, p) => a + p.resultado, 0);
  return (
    <SectionCard title="Impacto das inaugurações na rede" description={`Resultado mensal das lojas novas nos próximos ${MESES_NO_IMPACTO} meses: cada unidade segue a curva de maturação do seu cenário a partir do mês de abertura.`}>
      {semUnidades ? (
        <p className="text-sm text-muted-foreground">Cadastre inaugurações (planejadas ou inauguradas, com data) para ver o impacto.</p>
      ) : (
        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-3" aria-label="Resultado acumulado das lojas novas">
            <KpiCard rotulo="Próximos 12 meses" valor={brl(soma(12))} detalhe="resultado das lojas novas" tom={soma(12) >= 0 ? "ok" : "critico"} />
            <KpiCard rotulo="Próximos 24 meses" valor={brl(soma(24))} detalhe="resultado acumulado" tom={soma(24) >= 0 ? "ok" : "critico"} />
            <KpiCard rotulo={`Próximos ${MESES_NO_IMPACTO} meses`} valor={brl(soma(MESES_NO_IMPACTO))} detalhe={`${pontos[pontos.length - 1]?.lojasAbertas ?? 0} lojas novas abertas no fim`} tom={soma(MESES_NO_IMPACTO) >= 0 ? "ok" : "critico"} />
          </section>
          <ImpactoGrafico pontos={pontos} />
          <AcoesExportar
            arquivo="impacto-inauguracoes.csv"
            imprimir={false}
            linhas={[["Mês", "Lojas novas abertas", "Faturamento das novas (R$)", "Resultado das novas (R$)"], ...pontos.map((p) => [p.mes, p.lojasAbertas, Math.round(p.faturamento * 100) / 100, Math.round(p.resultado * 100) / 100])]}
          />
        </div>
      )}
    </SectionCard>
  );
}

/* ============================================================ rede com N lojas */

function RedeSimulada({ slug, cenarios, lojas, unidades, config, baseDre, mesRef, editavel }: { slug: string; cenarios: Cenario[]; lojas: Loja[]; unidades: UnidadeExpansao[]; config: ConfigExpansao; baseDre: Props["baseDre"]; mesRef: string | null; editavel: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [meta, setMeta] = useState(String(config.metaLojas));
  const [minimo, setMinimo] = useState(paraTexto(config.faturamentoMinimo));
  const [base, setBase] = useState<string[]>(config.lojasBase);
  const padrao = cenarios.find((c) => c.padrao) ?? cenarios[0] ?? null;
  const [cenarioId, setCenarioId] = useState(padrao?.id ?? "");
  const cenario = cenarios.find((c) => c.id === cenarioId) ?? padrao;

  const metaN = lerNumero(meta);
  const minimoN = lerNumero(minimo);
  const lojasOperando = lojas.filter((l) => l.status !== "inativa");
  const qtdNovas = Math.max(0, (config.metaLojas ?? 0) - config.lojasBase.length);

  const nomesNovas = useMemo(() => {
    const dasLojas = lojasOperando.filter((l) => !config.lojasBase.includes(l.id)).map((l) => l.nome);
    const dasUnidades = unidades.filter((u) => u.status !== "cancelada" && !u.lojaId).map((u) => u.nome);
    return [...dasLojas, ...dasUnidades];
  }, [lojasOperando, unidades, config.lojasBase]);


  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (metaN == null || !Number.isInteger(metaN) || minimoN == null) {
      setMsg({ tipo: "error", texto: "Informe a meta de lojas (número inteiro) e o faturamento mínimo (apenas dígitos, vírgula ou ponto)." });
      return;
    }
    iniciar(async () => {
      const r = await salvarConfigExpansaoAction(slug, { metaLojas: metaN, faturamentoMinimo: minimoN, lojasBase: base });
      if (r.success) {
        setMsg({ tipo: "success", texto: "Configuração da rede salva." });
        router.refresh();
      } else setMsg({ tipo: "error", texto: r.error });
    });
  };

  return (
    <SectionCard title={`Rede com ${config.metaLojas} lojas`} description="Simula a rede inteira: as lojas-base com o DRE do último mês com vendas, mais as lojas novas pelo cenário escolhido. O ponto de equilíbrio da rede é a soma dos pontos de equilíbrio.">
      <div className="space-y-5">
        {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}
        {editavel ? (
          <form onSubmit={salvar} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="rd-meta">Meta de lojas da rede</Label>
                <Input id="rd-meta" inputMode="numeric" value={meta} onChange={(e) => setMeta(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rd-min">Faturamento mínimo por loja nova (R$)</Label>
                <Input id="rd-min" inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
              </div>
            </div>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Lojas-base (as que já operam e servem de ponto de partida)</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {lojasOperando.map((l) => (
                  <label key={l.id} className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4 rounded border-input" checked={base.includes(l.id)} onChange={(e) => setBase((b) => (e.target.checked ? [...b, l.id] : b.filter((x) => x !== l.id)))} />
                    {l.nome}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex justify-end">
              <Button type="submit" disabled={pendente}>
                {pendente ? "Salvando…" : "Salvar configuração"}
              </Button>
            </div>
          </form>
        ) : null}

        <SimulacaoRede cenarios={cenarios} cenarioId={cenarioId} aoMudarCenario={setCenarioId} cenario={cenario} baseDre={baseDre} mesRef={mesRef} qtdNovas={qtdNovas} meta={config.metaLojas} nomesNovas={nomesNovas} />
      </div>
    </SectionCard>
  );
}

function SimulacaoRede({ cenarios, cenarioId, aoMudarCenario, cenario, baseDre, mesRef, qtdNovas, meta, nomesNovas }: { cenarios: Cenario[]; cenarioId: string; aoMudarCenario: (id: string) => void; cenario: Cenario | null; baseDre: Props["baseDre"]; mesRef: string | null; qtdNovas: number; meta: number; nomesNovas: string[] }) {
  const sim = useMemo(() => {
    if (!cenario || baseDre.length === 0) return null;
    return simularRede({ base: baseDre.map((b) => b.d), qtdNovas, orcado: orcDre(premissasDoCenario(cenario)) });
  }, [cenario, baseDre, qtdNovas]);
  const baseConsolidada = useMemo(() => (baseDre.length ? consolidarDre(baseDre.map((b) => b.d)) : null), [baseDre]);
  return (
    <div className="space-y-4">
      <div className="max-w-sm space-y-1">
        <Label htmlFor="rd-cenario">Cenário das lojas novas</Label>
        <NativeSelect id="rd-cenario" value={cenarioId} onChange={(e) => aoMudarCenario(e.target.value)}>
          {cenarios.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
              {c.padrao ? " ★" : ""}
            </option>
          ))}
        </NativeSelect>
      </div>
      {!cenario ? (
        <FeedbackMessage variant="info">Cadastre um cenário de orçamento para simular a rede.</FeedbackMessage>
      ) : baseDre.length === 0 || !sim || !baseConsolidada ? (
        <FeedbackMessage variant="info">Sem vendas lançadas nas lojas-base: a simulação parte do DRE do último mês com vendas. Lance vendas (ou escolha as lojas-base acima) para simular.</FeedbackMessage>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {baseDre.map((b) => b.nome).join(" + ")} (DRE de {mesAno(mesRef)}) + {descreverNovas(nomesNovas, qtdNovas)} pelo cenário “{cenario.nome}” = {meta} lojas.
          </p>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Rede simulada">
            <KpiCard rotulo="Faturamento mensal da rede" valor={brl(sim.consolidado.fat)} detalhe={`${meta} lojas`} />
            <KpiCard rotulo="Resultado mensal da rede" valor={brl(sim.consolidado.res)} detalhe={`margem ${pct1(sim.consolidado.mg)}`} tom={sim.consolidado.res >= 0 ? "ok" : "critico"} />
            <KpiCard rotulo="Resultado anual (12 × o mês)" valor={brl(sim.consolidado.res * 12)} detalhe="com todas as lojas maduras" />
            <KpiCard rotulo="Ponto de equilíbrio da rede" valor={sim.consolidado.pe != null ? brl(sim.consolidado.pe) : "—"} detalhe="soma dos pontos de equilíbrio" />
          </section>
          <TabelaDre
            titulo="DRE da rede simulada"
            descricao={`Lojas-base com o DRE do último mês com vendas; lojas novas maduras pelo cenário (${qtdNovas}).`}
            colunas={[
              { nome: "Lojas-base", d: baseConsolidada, estimadas: null },
              { nome: `${qtdNovas} ${qtdNovas === 1 ? "nova" : "novas"}`, d: sim.novas, estimadas: null },
              { nome: `Rede (${meta})`, d: sim.consolidado, estimadas: null, rede: true },
            ]}
          />
        </>
      )}
    </div>
  );
}
