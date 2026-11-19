"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { KpiCard } from "@/components/rede/kpi-card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SectionCard } from "@/components/ui/section-card";
import { historicoNineBoxAction, limparNineBoxAction, salvarNineBoxAction } from "@/lib/rede/actions-talentos";
import { CARGOS_RH, mesesDeCasa, rotuloCargo, textoTempoDeCasa } from "@/lib/rede/rh";
import {
  contarTalentos,
  descreverMudancaNineBox,
  juntarNineBox,
  linhasCsvNineBox,
  matrizNineBox,
  NIVEIS_NINE_BOX,
  ORDEM_LEGENDA_NINE_BOX,
  quadrante,
  type ItemHistoricoNineBox,
  type PessoaNineBox,
} from "@/lib/rede/talentos";
import type { CargoRh, ColaboradorRh, NineBoxRh, NivelNineBox } from "@/lib/rede/tipos";

type Msg = { tipo: "success" | "error"; texto: string } | null;
type LojaRef = { id: string; nome: string };

const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const ROTULO_Y: Record<number, string> = { 3: "Alto", 2: "Médio", 1: "Baixo" };
const quando = (iso: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

type Props = {
  slug: string;
  hoje: string;
  lojas: LojaRef[];
  /** Filtro de loja da tela (para o histórico). */
  lojaFiltroId: string | null;
  colaboradores: ColaboradorRh[];
  ninebox: NineBoxRh[];
  editavel: boolean;
  /** Só administrador e consultor leem o histórico. */
  podeHistorico: boolean;
};

export function RhNineBox({ slug, hoje, lojas, lojaFiltroId, colaboradores, ninebox, editavel, podeHistorico }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [cargo, setCargo] = useState<CargoRh | "todos">("todos");
  const [msg, setMsg] = useState<Msg>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [remover, setRemover] = useState<PessoaNineBox | null>(null);
  const [erroRemover, setErroRemover] = useState<string | null>(null);
  const [historico, setHistorico] = useState<ItemHistoricoNineBox[] | null>(null);
  const [erroHistorico, setErroHistorico] = useState<string | null>(null);

  const nomeLoja = useMemo(() => new Map(lojas.map((l) => [l.id, l.nome] as const)), [lojas]);
  const nome = (id: string) => nomeLoja.get(id) ?? "Loja";
  const ids = useMemo(() => lojas.map((l) => l.id), [lojas]);
  const nomeColab = useMemo(() => new Map(colaboradores.map((c) => [c.id, c.nome] as const)), [colaboradores]);

  const todos = useMemo(() => juntarNineBox(colaboradores, ninebox, { lojaIds: ids }, nome), [colaboradores, ninebox, ids]); // eslint-disable-line react-hooks/exhaustive-deps
  const pessoas = useMemo(() => juntarNineBox(colaboradores, ninebox, { lojaIds: ids, cargo: cargo === "todos" ? null : cargo }, nome), [colaboradores, ninebox, ids, cargo]); // eslint-disable-line react-hooks/exhaustive-deps
  const matriz = useMemo(() => matrizNineBox(pessoas), [pessoas]);

  const salvar = async (p: PessoaNineBox, d: NivelNineBox, pt: NivelNineBox, obs: string): Promise<boolean> => {
    setMsg(null);
    setSalvandoId(p.colaborador.id);
    const r = await salvarNineBoxAction(slug, { lojaId: p.colaborador.lojaId, colaboradorId: p.colaborador.id, desempenho: d, potencial: pt, observacoes: obs.trim() === "" ? null : obs.trim() });
    setSalvandoId(null);
    if (r.success) {
      setMsg({ tipo: "success", texto: `${p.colaborador.nome}: ${quadrante(d, pt).nome}. A matriz e a sucessão já refletem a mudança.` });
      iniciar(() => router.refresh());
      return true;
    }
    setMsg({ tipo: "error", texto: r.error });
    return false;
  };

  const confirmarRemocao = () => {
    if (!remover) return;
    setErroRemover(null);
    iniciar(async () => {
      const r = await limparNineBoxAction(slug, remover.colaborador.id);
      if (r.success) {
        setRemover(null);
        setMsg({ tipo: "success", texto: "Avaliação removida: a pessoa voltou a \"sem avaliação\"." });
        router.refresh();
      } else setErroRemover(r.error);
    });
  };

  const carregarHistorico = () => {
    setErroHistorico(null);
    iniciar(async () => {
      const r = await historicoNineBoxAction(slug, lojaFiltroId);
      if (r.success) setHistorico(r.itens);
      else setErroHistorico(r.error);
    });
  };

  return (
    <div className="space-y-5">
      {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}

      <section aria-label="Resumo do Nine Box" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard rotulo="Pessoas ativas" valor={nf0.format(pessoas.length)} detalhe={cargo === "todos" ? "no filtro de lojas" : rotuloCargo(cargo)} />
        <KpiCard rotulo="Avaliadas" valor={nf0.format(matriz.avaliados)} detalhe="com desempenho e potencial" tom="neutro" />
        <KpiCard rotulo="Sem avaliação" valor={nf0.format(matriz.pendentes)} detalhe="não aparecem na matriz" tom={matriz.pendentes > 0 ? "atencao" : "neutro"} />
        <KpiCard rotulo="Talentos" valor={nf0.format(contarTalentos(pessoas))} detalhe="alto desempenho e alto potencial" tom={contarTalentos(pessoas) > 0 ? "ok" : "neutro"} />
      </section>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3 print:hidden">
        <div className="min-w-56 space-y-1">
          <Label htmlFor="nb-cargo">Cargo</Label>
          <NativeSelect id="nb-cargo" value={cargo} onChange={(e) => setCargo(e.target.value as CargoRh | "todos")}>
            <option value="todos">Todos os cargos</option>
            {CARGOS_RH.map((c) => (
              <option key={c.k} value={c.k}>
                {c.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <p className="max-w-xl text-xs text-muted-foreground">
          {editavel ? "Altere desempenho e potencial na tabela abaixo; a matriz e a sucessão se atualizam na hora. " : "Seu perfil pode consultar o Nine Box, mas não alterar as avaliações. "}
          Quem ainda não foi avaliado fica de fora da matriz — nenhuma nota é assumida.
        </p>
      </div>

      <SectionCard title="Matriz Nine Box" description={`${pessoas.length} ${pessoas.length === 1 ? "pessoa" : "pessoas"}${matriz.pendentes > 0 ? `, ${matriz.pendentes} sem avaliação` : ""}`}>
        {pessoas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum colaborador ativo neste filtro. Cadastre as pessoas em Quadro de pessoal.</p>
        ) : (
          <div className="grid grid-cols-[2.75rem_repeat(3,minmax(0,1fr))] gap-2" role="group" aria-label="Matriz de desempenho por potencial">
            {[3, 2, 1].map((p) => (
              <LinhaMatriz key={p} potencial={p} celulas={matriz.celulas.filter((c) => c.potencial === p)} nomeLoja={nome} />
            ))}
            <span />
            <span className="text-center text-xs text-muted-foreground">Baixo</span>
            <span className="text-center text-xs font-medium text-muted-foreground">Desempenho</span>
            <span className="text-center text-xs text-muted-foreground">Alto</span>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Eixo vertical: potencial (de baixo para alto). Eixo horizontal: desempenho (de baixo para alto).</p>
      </SectionCard>

      <SectionCard title="O que fazer em cada quadrante">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ORDEM_LEGENDA_NINE_BOX.map((k) => {
            const q = quadrante(Number(k[0]), Number(k[2]));
            return (
              <li key={k} className="rounded-lg border border-border p-3" style={{ borderLeft: `4px solid ${q.cor}` }}>
                <b className="text-sm">{q.nome}</b>
                <p className="mt-1 text-xs text-muted-foreground">{q.orientacao}</p>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <SectionCard title="Avaliação individual" description="Desempenho e potencial de cada pessoa ativa. Ao mudar, a avaliação é salva na hora.">
        <div className="mb-3">
          <AcoesExportar arquivo="nine-box-fat-buddha.csv" linhas={linhasCsvNineBox(pessoas, nome)} />
        </div>
        {pessoas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguém para avaliar neste filtro.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Nome</th>
                  <th className="py-2 pr-3 font-medium">Cargo</th>
                  <th className="py-2 pr-3 font-medium">Loja</th>
                  <th className="py-2 pr-3 font-medium">Tempo de casa</th>
                  <th className="py-2 pr-3 font-medium">Desempenho</th>
                  <th className="py-2 pr-3 font-medium">Potencial</th>
                  <th className="py-2 pr-3 font-medium">Quadrante</th>
                  <th className="py-2 pr-3 font-medium">Observação</th>
                  {editavel ? <th className="py-2 text-right font-medium">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {pessoas.map((p) => (
                  <LinhaPessoa
                    key={`${p.colaborador.id}-${p.avaliacao?.desempenho ?? 0}-${p.avaliacao?.potencial ?? 0}-${p.avaliacao?.observacoes ?? ""}`}
                    p={p}
                    hoje={hoje}
                    lojaNome={nome(p.colaborador.lojaId)}
                    editavel={editavel}
                    salvando={salvandoId === p.colaborador.id}
                    aoSalvar={salvar}
                    aoRemover={() => { setErroRemover(null); setRemover(p); }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {todos.length !== pessoas.length ? <p className="mt-2 text-xs text-muted-foreground">Mostrando {pessoas.length} de {todos.length} pessoas (filtro de cargo).</p> : null}
      </SectionCard>

      {podeHistorico ? (
        <SectionCard title="Histórico das alterações" description="Quem avaliou, quando e o que mudou (até as 100 últimas alterações do filtro de lojas).">
          {historico == null ? (
            <Button type="button" variant="outline" disabled={pendente} onClick={carregarHistorico}>
              {pendente && salvandoId == null ? "Carregando…" : "Mostrar histórico"}
            </Button>
          ) : historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>
          ) : (
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Quando</th>
                    <th className="py-2 pr-3 font-medium">Quem</th>
                    <th className="py-2 pr-3 font-medium">Colaborador</th>
                    <th className="py-2 font-medium">O que mudou</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((h) => (
                    <tr key={h.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 tabular-nums">{quando(h.quando)}</td>
                      <td className="py-2 pr-3">{h.usuario}</td>
                      <td className="py-2 pr-3 font-medium">{h.colaboradorId ? (nomeColab.get(h.colaboradorId) ?? "Colaborador fora deste filtro") : "—"}</td>
                      <td className="py-2">{descreverMudancaNineBox(h)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {erroHistorico ? <FeedbackMessage variant="error">{erroHistorico}</FeedbackMessage> : null}
        </SectionCard>
      ) : null}

      <ConfirmDialog
        open={remover != null}
        onOpenChange={(o) => !o && setRemover(null)}
        title="Remover esta avaliação?"
        description={remover ? `${remover.colaborador.nome} volta a "sem avaliação" e deixa de aparecer na matriz e como sucessor. A remoção fica registrada no histórico de alterações.` : ""}
        confirmLabel="Remover"
        loading={pendente}
        error={erroRemover}
        onConfirm={confirmarRemocao}
      />
    </div>
  );
}

/* ============================================================ matriz */

function LinhaMatriz({ potencial, celulas, nomeLoja }: { potencial: number; celulas: ReturnType<typeof matrizNineBox>["celulas"]; nomeLoja: (id: string) => string }) {
  return (
    <>
      <span className="flex items-center justify-end pr-1 text-xs text-muted-foreground">{ROTULO_Y[potencial]}</span>
      {celulas.map((c) => (
        <section
          key={c.chave}
          aria-label={`${c.quadrante.nome}: ${c.pessoas.length} ${c.pessoas.length === 1 ? "pessoa" : "pessoas"}`}
          className="min-h-28 rounded-lg border border-border p-2"
          style={{ borderLeft: `4px solid ${c.quadrante.cor}`, backgroundColor: `${c.quadrante.cor}1f` }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <b className="text-xs">{c.quadrante.nome}</b>
            <span className="text-xs tabular-nums text-muted-foreground">{c.pessoas.length}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {c.pessoas.map((x) => (
              <span key={x.colaborador.id} title={`${rotuloCargo(x.colaborador.cargo)} · ${nomeLoja(x.colaborador.lojaId)}`} className="rounded bg-background/70 px-1.5 py-0.5 text-[11px]">
                {x.colaborador.nome}
                <i className="ml-1 text-[10px] not-italic text-muted-foreground">{rotuloCargo(x.colaborador.cargo).split(" ")[0]}</i>
              </span>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

/* ============================================================ linha da avaliação individual */

function LinhaPessoa({
  p,
  hoje,
  lojaNome,
  editavel,
  salvando,
  aoSalvar,
  aoRemover,
}: {
  p: PessoaNineBox;
  hoje: string;
  lojaNome: string;
  editavel: boolean;
  salvando: boolean;
  aoSalvar: (p: PessoaNineBox, d: NivelNineBox, pt: NivelNineBox, obs: string) => Promise<boolean>;
  aoRemover: () => void;
}) {
  const a = p.avaliacao;
  const [d, setD] = useState<NivelNineBox | null>(a?.desempenho ?? null);
  const [pt, setPt] = useState<NivelNineBox | null>(a?.potencial ?? null);
  const [obs, setObs] = useState(a?.observacoes ?? "");
  const c = p.colaborador;
  const q = d != null && pt != null ? quadrante(d, pt) : null;

  const escolher = async (campo: "d" | "p", valor: string) => {
    const n = valor === "" ? null : (Number(valor) as NivelNineBox);
    const novoD = campo === "d" ? n : d;
    const novoP = campo === "p" ? n : pt;
    if (campo === "d") setD(n);
    else setPt(n);
    // Só grava quando os dois níveis estão escolhidos (nunca assume "médio" no lugar do que falta).
    if (novoD != null && novoP != null) {
      const ok = await aoSalvar(p, novoD, novoP, obs);
      if (!ok) {
        // Não gravou: a linha volta ao que está no banco, para a tela nunca mostrar uma nota que não existe.
        setD(a?.desempenho ?? null);
        setPt(a?.potencial ?? null);
      }
    }
  };
  const aoSairDaObservacao = async () => {
    if (a && d != null && pt != null && obs.trim() !== (a.observacoes ?? "")) {
      const ok = await aoSalvar(p, d, pt, obs);
      if (!ok) setObs(a.observacoes ?? "");
    }
  };

  return (
    <tr className="border-b border-border/60 align-middle last:border-0">
      <td className="py-2 pr-3 font-medium">
        {c.nome}
        {c.origem === "exemplo" ? <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">EXEMPLO</span> : null}
      </td>
      <td className="py-2 pr-3">{rotuloCargo(c.cargo)}</td>
      <td className="py-2 pr-3">{lojaNome}</td>
      <td className="py-2 pr-3">{textoTempoDeCasa(mesesDeCasa(c.dataAdmissao, hoje))}</td>
      <td className="py-2 pr-3">
        {editavel ? (
          <NativeSelect aria-label={`Desempenho de ${c.nome}`} value={d ?? ""} disabled={salvando} onChange={(e) => void escolher("d", e.target.value)}>
            {a == null && d == null ? <option value="">Selecionar</option> : null}
            {NIVEIS_NINE_BOX.map((n) => (
              <option key={n.k} value={n.k}>
                {n.nome}
              </option>
            ))}
          </NativeSelect>
        ) : (
          (NIVEIS_NINE_BOX.find((n) => n.k === d)?.nome ?? "—")
        )}
      </td>
      <td className="py-2 pr-3">
        {editavel ? (
          <NativeSelect aria-label={`Potencial de ${c.nome}`} value={pt ?? ""} disabled={salvando} onChange={(e) => void escolher("p", e.target.value)}>
            {a == null && pt == null ? <option value="">Selecionar</option> : null}
            {NIVEIS_NINE_BOX.map((n) => (
              <option key={n.k} value={n.k}>
                {n.nome}
              </option>
            ))}
          </NativeSelect>
        ) : (
          (NIVEIS_NINE_BOX.find((n) => n.k === pt)?.nome ?? "—")
        )}
      </td>
      <td className="py-2 pr-3">
        {q ? (
          <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ border: `1px solid ${q.cor}`, backgroundColor: `${q.cor}22` }}>
            {q.nome}
          </span>
        ) : (
          <span className="text-muted-foreground">sem avaliação</span>
        )}
      </td>
      <td className="py-2 pr-3">
        {editavel ? (
          <Input
            aria-label={`Observação sobre ${c.nome}`}
            className="min-w-44"
            value={obs}
            maxLength={500}
            disabled={salvando || a == null}
            placeholder={a == null ? "Avalie primeiro" : ""}
            onChange={(e) => setObs(e.target.value)}
            onBlur={() => void aoSairDaObservacao()}
          />
        ) : (
          (a?.observacoes ?? "—")
        )}
      </td>
      {editavel ? (
        <td className="py-1 text-right">
          {a ? (
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remover a avaliação de ${c.nome}`} disabled={salvando} onClick={aoRemover}>
              <Trash2 aria-hidden />
            </Button>
          ) : null}
        </td>
      ) : null}
    </tr>
  );
}
