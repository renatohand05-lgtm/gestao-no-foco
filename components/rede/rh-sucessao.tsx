"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { KpiCard } from "@/components/rede/kpi-card";
import { StatusPill } from "@/components/rede/status";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/ui/section-card";
import { Textarea } from "@/components/ui/textarea";
import { restaurarCriterioAction, salvarCriterioAction } from "@/lib/rede/actions-talentos";
import { rotuloCargo } from "@/lib/rede/rh";
import {
  CARGOS_CARREIRA,
  contarTalentos,
  criterioDoCargo,
  juntarNineBox,
  linhasCsvSucessao,
  mapaSucessao,
  prontosParaSubir,
  quadrante,
  rotuloCargoCarreira,
  TRILHAS,
} from "@/lib/rede/talentos";
import type { CargoCarreira, ColaboradorRh, CriterioCargo, NineBoxRh } from "@/lib/rede/tipos";

type Msg = { tipo: "success" | "error"; texto: string } | null;
type LojaRef = { id: string; nome: string };

const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

type Props = {
  slug: string;
  hoje: string;
  lojas: LojaRef[];
  colaboradores: ColaboradorRh[];
  ninebox: NineBoxRh[];
  criterios: CriterioCargo[];
  /** Pode ajustar os critérios por cargo (vale para a empresa toda). */
  editavel: boolean;
};

export function RhSucessao({ slug, hoje, lojas, colaboradores, ninebox, criterios, editavel }: Props) {
  const nomeLoja = useMemo(() => new Map(lojas.map((l) => [l.id, l.nome] as const)), [lojas]);
  const nome = (id: string) => nomeLoja.get(id) ?? "Loja";
  const ids = useMemo(() => lojas.map((l) => l.id), [lojas]);

  const pessoas = useMemo(() => juntarNineBox(colaboradores, ninebox, { lojaIds: ids }, nome), [colaboradores, ninebox, ids]); // eslint-disable-line react-hooks/exhaustive-deps
  const mapa = useMemo(() => mapaSucessao(ids, pessoas, criterios, hoje), [ids, pessoas, criterios, hoje]);
  const prontosPorCargo = useMemo(() => new Map(CARGOS_CARREIRA.map((c) => [c, prontosParaSubir(c, pessoas, criterios, hoje)] as const)), [pessoas, criterios, hoje]);
  const totalProntos = [...prontosPorCargo.values()].reduce((a, l) => a + l.length, 0);
  const semSucessor = mapa.filter((l) => l.risco.rotulo === "Sem sucessor").length;
  const semAvaliacao = pessoas.filter((p) => p.avaliacao == null).length;

  return (
    <div className="space-y-5">
      <section aria-label="Resumo de sucessão e carreira" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard rotulo="Talentos" valor={nf0.format(contarTalentos(pessoas))} detalhe="alto desempenho e alto potencial" tom={contarTalentos(pessoas) > 0 ? "ok" : "neutro"} />
        <KpiCard rotulo="Prontos para subir" valor={nf0.format(totalProntos)} detalhe="potencial alto, desempenho médio ou alto e tempo mínimo" tom={totalProntos > 0 ? "ok" : "neutro"} />
        <KpiCard rotulo="Cargos-chave sem sucessor" valor={nf0.format(semSucessor)} detalhe={`de ${nf0.format(mapa.length)} posições mapeadas`} tom={semSucessor > 0 ? "critico" : "neutro"} />
        <KpiCard rotulo="Sem avaliação no Nine Box" valor={nf0.format(semAvaliacao)} detalhe="não entram como sucessores" tom={semAvaliacao > 0 ? "atencao" : "neutro"} />
      </section>

      <FeedbackMessage variant="info">Os sucessores e os prontos para subir saem das notas do Nine Box e do tempo de casa: ao mudar uma avaliação lá, esta tela já reflete a mudança.</FeedbackMessage>

      <SectionCard title="Trilhas de carreira" description="Os passos de cada trilha, o critério para subir e quem já cumpre (nas lojas do filtro).">
        <div className="space-y-5">
          {TRILHAS.map((t) => (
            <div key={t.nome}>
              <h4 className="mb-2 text-sm font-semibold">{t.nome}</h4>
              <ol className="grid gap-3 lg:grid-cols-4">
                {t.cargos.map((c, i) => {
                  const crit = criterioDoCargo(c, criterios);
                  const prontos = prontosPorCargo.get(c) ?? [];
                  const n = c === "supervisor_regional" ? 0 : pessoas.filter((p) => p.colaborador.cargo === c).length;
                  return (
                    <li key={c} className="relative rounded-lg border border-border p-3">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Passo {i + 1}</span>
                      <p className="text-sm font-semibold">{rotuloCargoCarreira(c)}</p>
                      <p className="text-xs text-muted-foreground">{n > 0 ? `${n} ${n === 1 ? "pessoa" : "pessoas"}` : "—"}</p>
                      <p className="mt-2 text-xs">{crit.texto}</p>
                      {crit.min != null ? (
                        <p className={`mt-2 text-xs font-medium ${prontos.length > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
                          {prontos.length} {prontos.length === 1 ? "pronto" : "prontos"} para subir{prontos.length > 0 ? `: ${prontos.map((p) => p.colaborador.nome).join(", ")}` : ""}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      </SectionCard>

      <CriteriosPorCargo slug={slug} criterios={criterios} editavel={editavel} />

      <SectionCard title="Mapa de sucessão dos cargos-chave" description="Sucessor indicado automaticamente pelo Nine Box (maior potencial, depois maior desempenho; empate: mais tempo de casa).">
        <div className="mb-3">
          <AcoesExportar arquivo="sucessao-fat-buddha.csv" linhas={linhasCsvSucessao(mapa, nome)} />
        </div>
        {mapa.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma loja neste filtro.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Loja</th>
                  <th className="py-2 pr-3 font-medium">Cargo-chave</th>
                  <th className="py-2 pr-3 font-medium">Titular</th>
                  <th className="py-2 pr-3 font-medium">Nine box do titular</th>
                  <th className="py-2 pr-3 font-medium">Sucessor indicado</th>
                  <th className="py-2 pr-3 font-medium">Prontidão</th>
                  <th className="py-2 pr-3 font-medium">Tempo mínimo</th>
                  <th className="py-2 font-medium">Risco</th>
                </tr>
              </thead>
              <tbody>
                {mapa.map((l) => {
                  const t = l.titulares[0];
                  const c = l.candidatos[0];
                  return (
                    <tr key={`${l.lojaId}-${l.cargo}`} className="border-b border-border/60 align-top last:border-0">
                      <td className="py-2 pr-3 font-medium">{nome(l.lojaId)}</td>
                      <td className="py-2 pr-3">{rotuloCargo(l.cargo)}</td>
                      <td className="py-2 pr-3">
                        {t ? (
                          <>
                            {t.colaborador.nome}
                            {l.titulares.length > 1 ? <span className="ml-1 text-xs text-muted-foreground">+{l.titulares.length - 1}</span> : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-3">{t?.avaliacao ? quadrante(t.avaliacao.desempenho, t.avaliacao.potencial).nome : t ? <span className="text-muted-foreground">sem avaliação</span> : "—"}</td>
                      <td className="py-2 pr-3">
                        {c ? (
                          <>
                            {c.pessoa.colaborador.nome} <span className="text-xs text-muted-foreground">({rotuloCargo(c.pessoa.colaborador.cargo)})</span>
                            {l.candidatos.length > 1 ? <span className="ml-1 text-xs text-muted-foreground">+{l.candidatos.length - 1}</span> : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Nenhum candidato com potencial</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">{c ? <StatusPill status={c.prontidao.tom}>{c.prontidao.rotulo}</StatusPill> : "—"}</td>
                      <td className="py-2 pr-3">{c ? (c.tempoMinimo == null ? "—" : c.tempoMinimo ? "Atendido" : "Ainda não") : "—"}</td>
                      <td className="py-2">
                        <StatusPill status={l.risco.tom}>{l.risco.rotulo}</StatusPill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ============================================================ critérios por cargo */

function CriteriosPorCargo({ slug, criterios, editavel }: { slug: string; criterios: CriterioCargo[]; editavel: boolean }) {
  const [editando, setEditando] = useState<CargoCarreira | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  return (
    <SectionCard title="Critérios por cargo" description="Tempo mínimo e requisitos para subir de cargo. Começam com os do painel original; o ajuste vale para todas as lojas da empresa. O tempo mínimo conta o tempo de casa (o cadastro guarda a admissão).">
      {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Cargo</th>
              <th className="py-2 pr-3 text-right font-medium">Tempo mínimo</th>
              <th className="py-2 pr-3 font-medium">Critério</th>
              <th className="py-2 pr-3 font-medium">Origem</th>
              {editavel ? <th className="py-2 text-right font-medium">Ações</th> : null}
            </tr>
          </thead>
          <tbody>
            {CARGOS_CARREIRA.map((c) => {
              const crit = criterioDoCargo(c, criterios);
              return (
                <tr key={c} className="border-b border-border/60 align-top last:border-0">
                  <td className="py-2 pr-3 font-medium">{rotuloCargoCarreira(c)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{crit.min == null ? "—" : `${crit.min} ${crit.min === 1 ? "mês" : "meses"}`}</td>
                  <td className="py-2 pr-3">{crit.texto}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{crit.ajustado ? "Ajustado pela empresa" : "Padrão do painel original"}</td>
                  {editavel ? (
                    <td className="py-1 text-right">
                      <Button type="button" variant="outline" size="sm" aria-label={`Ajustar o critério de ${rotuloCargoCarreira(c)}`} onClick={() => { setMsg(null); setEditando(c); }}>
                        Ajustar
                      </Button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editando ? (
        <EditorCriterio
          key={editando}
          slug={slug}
          cargo={editando}
          criterios={criterios}
          aoConcluir={(m) => {
            setMsg(m);
            if (m.tipo === "success") setEditando(null);
          }}
          aoCancelar={() => setEditando(null)}
        />
      ) : null}
    </SectionCard>
  );
}

function EditorCriterio({ slug, cargo, criterios, aoConcluir, aoCancelar }: { slug: string; cargo: CargoCarreira; criterios: CriterioCargo[]; aoConcluir: (m: NonNullable<Msg>) => void; aoCancelar: () => void }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const atual = criterioDoCargo(cargo, criterios);
  const [tempo, setTempo] = useState(atual.min == null ? "" : String(atual.min));
  const [texto, setTexto] = useState(atual.texto);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    const t = tempo.trim() === "" ? null : Number(tempo);
    if (t != null && (!Number.isInteger(t) || t < 0 || t > 120)) {
      setErro("O tempo mínimo é um número inteiro de meses, de 0 a 120 (ou vazio, se não houver exigência).");
      return;
    }
    if (texto.trim() === "") {
      setErro("Descreva o critério.");
      return;
    }
    iniciar(async () => {
      const r = await salvarCriterioAction(slug, { cargo, tempoMinimoMeses: t, criterio: texto.trim() });
      if (r.success) {
        aoConcluir({ tipo: "success", texto: `Critério de ${rotuloCargoCarreira(cargo)} salvo. Os prontos para subir já usam o novo tempo mínimo.` });
        router.refresh();
      } else setErro(r.error);
    });
  };

  const restaurar = () => {
    setErro(null);
    iniciar(async () => {
      const r = await restaurarCriterioAction(slug, { cargo });
      if (r.success) {
        aoConcluir({ tipo: "success", texto: `Critério de ${rotuloCargoCarreira(cargo)} voltou ao padrão do painel original.` });
        router.refresh();
      } else setErro(r.error);
    });
  };

  return (
    <form onSubmit={salvar} className="mt-4 space-y-3 rounded-lg border border-border p-3" aria-label={`Ajustar o critério de ${rotuloCargoCarreira(cargo)}`}>
      <h4 className="text-sm font-medium">Ajustar critério: {rotuloCargoCarreira(cargo)}</h4>
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <div className="space-y-1">
          <Label htmlFor="crit-tempo">Tempo mínimo (meses)</Label>
          <Input id="crit-tempo" type="number" inputMode="numeric" min={0} max={120} step={1} value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="sem exigência" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="crit-texto">Critério</Label>
          <Textarea id="crit-texto" rows={3} maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
      </div>
      {erro ? <FeedbackMessage variant="error">{erro}</FeedbackMessage> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar critério"}
        </Button>
        {atual.ajustado ? (
          <Button type="button" variant="outline" disabled={pendente} onClick={restaurar}>
            Voltar ao padrão
          </Button>
        ) : null}
        <Button type="button" variant="ghost" disabled={pendente} onClick={aoCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
