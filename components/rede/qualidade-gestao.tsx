"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Eye, Pencil, Printer, Trash2 } from "lucide-react";

import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { KpiCard } from "@/components/rede/kpi-card";
import { COR_STATUS, StatusPill } from "@/components/rede/status";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SectionCard } from "@/components/ui/section-card";
import { excluirVisitaAction, salvarVisitaAction } from "@/lib/rede/actions-qualidade";
import { LINHAS_NO_HISTORICO } from "@/lib/rede/cozinha";
import { PRIORIDADES_PLANO, contarPorOrigem, estaAtrasado, rotuloStatusPlano } from "@/lib/rede/planos";
import {
  DIAS_SEM_VISITA,
  META_NOTA_QUALIDADE,
  RESPOSTAS_QUALIDADE,
  SECOES_QUALIDADE,
  chaveItem,
  desviosDaVisita,
  formatarNota,
  linhasCsvVisitas,
  resumirVisita,
  statusNota,
  type ResumoRedeQualidade,
} from "@/lib/rede/qualidade";
import type { PlanoAcao, PrioridadePlano, RespostaQualidade, StatusPlano, VisitaQualidade } from "@/lib/rede/tipos";

type Msg = { tipo: "success" | "error"; texto: string } | null;
type LojaRef = { id: string; nome: string };

const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

type RespostaForm = { v: RespostaQualidade | null; o: string };
type AcaoForm = { acao: string; responsavel: string; prazo: string; prioridade: PrioridadePlano; status: StatusPlano };
const ACAO_VAZIA: AcaoForm = { acao: "", responsavel: "", prazo: "", prioridade: "media", status: "pendente" };

type Props = {
  slug: string;
  lojas: LojaRef[];
  /** Loja do filtro da tela (id) ou null = rede toda. */
  lojaFiltro: string | null;
  visitas: VisitaQualidade[];
  /** Planos de ação das visitas; null = o perfil não vê planos de ação. */
  planos: PlanoAcao[] | null;
  resumo: ResumoRedeQualidade;
  hoje: string;
  editavel: boolean;
  /** O perfil pode criar planos (visita com desvios só é salva com isso). */
  podeGerarPlanos: boolean;
  /** Visita pedida na URL, para abrir já em edição (ou leitura). */
  abrir: VisitaQualidade | null;
};

export function QualidadeGestao({ slug, lojas, lojaFiltro, visitas, planos, resumo, hoje, editavel, podeGerarPlanos, abrir }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [aberta, setAberta] = useState<VisitaQualidade | null>(abrir);
  const [excluir, setExcluir] = useState<VisitaQualidade | null>(null);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  const nomeLoja = useMemo(() => new Map(lojas.map((l) => [l.id, l.nome] as const)), [lojas]);
  const nome = (id: string) => nomeLoja.get(id) ?? "Loja";
  const planosDaVisita = (id: string): PlanoAcao[] => (planos ?? []).filter((p) => p.origemId === id);
  const contagem = useMemo(() => contarPorOrigem(planos ?? []), [planos]);
  const visiveis = visitas.slice(0, LINHAS_NO_HISTORICO);

  const abertosDasVisitas = (planos ?? []).filter((p) => p.origemTipo === "qualidade" && (p.status === "pendente" || p.status === "em_andamento"));
  const atrasados = abertosDasVisitas.filter((p) => estaAtrasado(p, hoje)).length;
  const semVisita = resumo.lojasSemVisita.map(nome);

  const confirmarExclusao = () => {
    if (!excluir) return;
    setErroExcluir(null);
    iniciar(async () => {
      const r = await excluirVisitaAction(slug, excluir.id);
      if (r.success) {
        setExcluir(null);
        if (aberta?.id === excluir.id) setAberta(null);
        setMsg({ tipo: "success", texto: "Visita excluída." });
        router.refresh();
      } else setErroExcluir(r.error);
    });
  };

  const abrirVisita = (v: VisitaQualidade) => {
    setMsg(null);
    setAberta(v);
    document.getElementById("ql-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-5">
      {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
        <KpiCard
          rotulo="Nota média das últimas visitas"
          valor={formatarNota(resumo.notaMedia)}
          detalhe={resumo.ultimas.length > 0 ? `Última visita de ${resumo.ultimas.length} ${resumo.ultimas.length === 1 ? "loja" : "lojas"} · meta ${META_NOTA_QUALIDADE}%` : "Nenhuma visita salva ainda"}
          progresso={resumo.notaMedia}
          tom={resumo.notaMedia == null ? "neutro" : ({ ok: "ok", warn: "atencao", bad: "critico", neu: "neutro" } as const)[statusNota(resumo.notaMedia)]}
        />
        <KpiCard rotulo={`Visitas nos últimos ${DIAS_SEM_VISITA} dias`} valor={String(resumo.visitasRecentes)} detalhe="Visitas salvas no período" />
        <KpiCard
          rotulo={`Sem visita há mais de ${DIAS_SEM_VISITA} dias`}
          valor={String(semVisita.length)}
          detalhe={semVisita.length === 0 ? "Todas as lojas foram visitadas" : semVisita.slice(0, 3).join(", ") + (semVisita.length > 3 ? ` e mais ${semVisita.length - 3}` : "")}
          tom={semVisita.length > 0 ? "atencao" : "ok"}
        />
        {planos ? (
          <KpiCard rotulo="Desvios com plano em aberto" valor={String(abertosDasVisitas.length)} detalhe={atrasados > 0 ? `${atrasados} atrasado${atrasados > 1 ? "s" : ""}` : "Nenhum atrasado"} tom={atrasados > 0 ? "critico" : abertosDasVisitas.length > 0 ? "atencao" : "ok"} />
        ) : null}
      </div>

      {resumo.ultimas.length > 0 ? (
        <SectionCard title={lojaFiltro ? "Evolução da nota da loja" : "Nota da última visita por loja"} description={lojaFiltro ? "Últimas visitas, da mais antiga para a mais recente." : "Da menor nota para a maior."}>
          <GraficoNotas
            itens={
              lojaFiltro
                ? visitas
                    .filter((v) => v.lojaId === lojaFiltro)
                    .slice(0, 12)
                    .reverse()
                    .map((v) => ({ chave: v.id, rotulo: dmy(v.data), nota: resumirVisita(v.respostas).nota, detalhe: v.avaliador }))
                : resumo.ultimas.map((u) => ({ chave: u.lojaId, rotulo: nome(u.lojaId), nota: u.nota, detalhe: dmy(u.visita.data) }))
            }
          />
        </SectionCard>
      ) : null}

      {editavel || aberta ? (
        <FormularioVisita
          key={`${aberta?.id ?? "nova"}-${editavel ? "e" : "l"}`}
          slug={slug}
          lojas={lojas}
          lojaFiltro={lojaFiltro}
          hoje={hoje}
          visita={aberta}
          planosDaVisita={aberta ? planosDaVisita(aberta.id) : []}
          somenteLeitura={!editavel}
          podeGerarPlanos={podeGerarPlanos}
          verPlanos={planos != null}
          pendente={pendente}
          iniciar={iniciar}
          aoSalvar={(m) => {
            setMsg(m);
            if (m.tipo === "success") {
              setAberta(null);
              router.refresh();
            }
          }}
          aoFechar={() => setAberta(null)}
        />
      ) : (
        <FeedbackMessage variant="info">Seu perfil pode consultar as visitas de qualidade, mas não lançar ou alterar. Use “Ver” no histórico para abrir uma visita.</FeedbackMessage>
      )}

      <SectionCard
        title="Histórico de visitas"
        description={visitas.length > visiveis.length ? `Mostrando as ${visiveis.length} mais recentes de ${visitas.length}. A exportação leva todas.` : `${visitas.length} ${visitas.length === 1 ? "visita" : "visitas"} nos últimos 2 anos.`}
      >
        <div className="mb-3">
          <AcoesExportar arquivo="visitas-qualidade-fat-buddha.csv" linhas={linhasCsvVisitas(visitas, planosDaVisita, nome)} />
        </div>
        {visitas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma visita salva ainda.{editavel ? " Preencha o checklist acima e clique em Salvar visita." : ""}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Data</th>
                  <th className="py-2 pr-3 font-medium">Loja</th>
                  <th className="py-2 pr-3 font-medium">Avaliador</th>
                  <th className="py-2 pr-3 font-medium">Gerente</th>
                  <th className="py-2 pr-3 text-right font-medium">Nota</th>
                  <th className="py-2 pr-3 text-right font-medium">Desvios</th>
                  <th className="py-2 pr-3 text-right font-medium">Ações abertas</th>
                  <th className="py-2 text-right font-medium print:hidden">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((v) => {
                  const r = resumirVisita(v.respostas);
                  const c = contagem.get(v.id);
                  return (
                    <tr key={v.id} className={`border-b border-border/60 last:border-0 ${aberta?.id === v.id ? "bg-muted/40" : ""}`}>
                      <td className="py-2 pr-3 tabular-nums">{dmy(v.data)}</td>
                      <td className="py-2 pr-3 font-medium">
                        {nome(v.lojaId)}
                        {v.origem === "exemplo" ? <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">EXEMPLO</span> : null}
                      </td>
                      <td className="py-2 pr-3">{v.avaliador || "—"}</td>
                      <td className="py-2 pr-3">{v.gerente ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{r.nota == null ? <span className="text-muted-foreground">—</span> : <StatusPill status={r.status}>{formatarNota(r.nota)}</StatusPill>}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{r.nao}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {planos == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : c && c.total > 0 ? (
                          <Link href={`/${slug}/rede/planos?origem=qualidade&registro=${v.id}&situacao=todas`} className="underline underline-offset-2" title="Ver os planos de ação desta visita">
                            {c.abertos}
                          </Link>
                        ) : (
                          0
                        )}
                      </td>
                      <td className="py-1 text-right whitespace-nowrap print:hidden">
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`${editavel ? "Abrir" : "Ver"} a visita de ${nome(v.lojaId)} de ${dmy(v.data)}`} onClick={() => abrirVisita(v)}>
                          {editavel ? <Pencil aria-hidden /> : <Eye aria-hidden />}
                        </Button>
                        {editavel ? (
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Excluir a visita de ${nome(v.lojaId)} de ${dmy(v.data)}`} onClick={() => { setErroExcluir(null); setExcluir(v); }}>
                            <Trash2 aria-hidden />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={excluir != null}
        onOpenChange={(o) => !o && setExcluir(null)}
        title="Excluir esta visita do histórico?"
        description={
          excluir
            ? `${nome(excluir.lojaId)} · ${dmy(excluir.data)}. Os planos de ação desta visita que ainda estão pendentes e sem ação somem junto; os que já têm trabalho feito ficam na lista de planos, sem o vínculo. A exclusão fica registrada no histórico de alterações.`
            : ""
        }
        confirmLabel="Excluir"
        loading={pendente}
        error={erroExcluir}
        onConfirm={confirmarExclusao}
      />
    </div>
  );
}

/* ============================================================ gráfico de notas */

function GraficoNotas({ itens }: { itens: { chave: string; rotulo: string; nota: number | null; detalhe: string }[] }) {
  return (
    <ul className="space-y-2" aria-label="Notas das visitas">
      {itens.map((i) => {
        const st = statusNota(i.nota);
        return (
          <li key={i.chave} className="grid grid-cols-[minmax(5rem,10rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate font-medium" title={i.rotulo}>
              {i.rotulo}
            </span>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${i.rotulo}: ${formatarNota(i.nota)}`}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, i.nota ?? 0))}%`, backgroundColor: COR_STATUS[st] }} />
              <span className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${META_NOTA_QUALIDADE}%` }} aria-hidden />
            </div>
            <span className="min-w-24 text-right tabular-nums">
              <StatusPill status={st}>{formatarNota(i.nota)}</StatusPill>
              <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">{i.detalhe}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ============================================================ anel da nota */

function Anel({ nota }: { nota: number | null }) {
  const r = 48;
  const c = 2 * Math.PI * r;
  const st = statusNota(nota);
  return (
    <div className="relative size-[110px] shrink-0" role="img" aria-label={`Nota da visita: ${formatarNota(nota)}`}>
      <svg width="110" height="110" viewBox="0 0 110 110" aria-hidden>
        <circle cx="55" cy="55" r={r} strokeWidth="10" fill="none" className="stroke-muted" />
        <circle cx="55" cy="55" r={r} strokeWidth="10" fill="none" strokeLinecap="round" stroke={COR_STATUS[st]} strokeDasharray={c} strokeDashoffset={c * (1 - (nota ?? 0) / 100)} transform="rotate(-90 55 55)" style={{ transition: "stroke-dashoffset .6s" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <b className="text-xl tabular-nums">{formatarNota(nota)}</b>
        <span className="text-[10px] leading-tight text-muted-foreground">nota da visita</span>
      </div>
    </div>
  );
}

/* ============================================================ formulário */

type FormProps = {
  slug: string;
  lojas: LojaRef[];
  lojaFiltro: string | null;
  hoje: string;
  /** Visita aberta do histórico (edição ou leitura); null = visita nova. */
  visita: VisitaQualidade | null;
  planosDaVisita: PlanoAcao[];
  somenteLeitura: boolean;
  podeGerarPlanos: boolean;
  verPlanos: boolean;
  pendente: boolean;
  iniciar: (fn: () => void) => void;
  aoSalvar: (m: NonNullable<Msg>) => void;
  aoFechar: () => void;
};

function FormularioVisita({ slug, lojas, lojaFiltro, hoje, visita, planosDaVisita, somenteLeitura, podeGerarPlanos, verPlanos, pendente, iniciar, aoSalvar, aoFechar }: FormProps) {
  const [lojaId, setLojaId] = useState(visita?.lojaId ?? (lojaFiltro && lojas.some((l) => l.id === lojaFiltro) ? lojaFiltro : (lojas[0]?.id ?? "")));
  const [data, setData] = useState(visita?.data ?? hoje);
  const [avaliador, setAvaliador] = useState(visita?.avaliador ?? "");
  const [gerente, setGerente] = useState(visita?.gerente ?? "");
  const [respostas, setRespostas] = useState<Record<string, RespostaForm>>(() => Object.fromEntries(Object.entries(visita?.respostas ?? {}).map(([k, r]) => [k, { v: r.v, o: r.o ?? "" }])));
  const [acoes, setAcoes] = useState<Record<string, AcaoForm>>(() =>
    Object.fromEntries(
      planosDaVisita
        .filter((p) => p.origemRef)
        .map((p) => [p.origemRef as string, { acao: p.acao ?? "", responsavel: p.responsavel ?? "", prazo: p.prazo ?? "", prioridade: p.prioridade, status: p.status }]),
    ),
  );
  const [fechadas, setFechadas] = useState<Set<number>>(new Set());

  const respostasLimpas = useMemo(() => Object.fromEntries(Object.entries(respostas).map(([k, r]) => [k, { v: r.v, o: r.o.trim() || null }])), [respostas]);
  const resumo = useMemo(() => resumirVisita(respostasLimpas), [respostasLimpas]);
  const desvios = useMemo(() => desviosDaVisita(respostasLimpas), [respostasLimpas]);
  const planoDe = (chave: string) => planosDaVisita.find((p) => p.origemRef === chave) ?? null;
  const naoDesvios = new Set(desvios.map((d) => d.chave));
  // Planos desta visita que deixam de existir (ou são cancelados) ao salvar: o item deixou de ser "Não".
  const retirados = planosDaVisita.filter((p) => p.origemRef && !naoDesvios.has(p.origemRef) && (p.status === "pendente" || p.status === "em_andamento"));
  const bloqueado = !somenteLeitura && !podeGerarPlanos && (desvios.length > 0 || (visita != null && planosDaVisita.length > 0));
  const editando = visita != null && !somenteLeitura;

  const marcar = (chave: string, v: RespostaQualidade) => setRespostas((s) => ({ ...s, [chave]: { v: s[chave]?.v === v ? null : v, o: s[chave]?.o ?? "" } }));
  const observar = (chave: string, o: string) => setRespostas((s) => ({ ...s, [chave]: { v: s[chave]?.v ?? null, o } }));
  const acaoDe = (chave: string): AcaoForm => acoes[chave] ?? ACAO_VAZIA;
  const mudarAcao = (chave: string, campo: keyof AcaoForm, valor: string) => setAcoes((s) => ({ ...s, [chave]: { ...(s[chave] ?? ACAO_VAZIA), [campo]: valor } }));

  const limpar = () => {
    setRespostas({});
    setAcoes({});
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (somenteLeitura) return;
    if (resumo.aplicaveis === 0) {
      aoSalvar({ tipo: "error", texto: "Avalie pelo menos um item antes de salvar." });
      return;
    }
    const entrada = {
      lojaId,
      data,
      avaliador,
      gerente: gerente.trim() || null,
      respostas: respostasLimpas,
      acoes: Object.fromEntries(
        desvios.map((d) => {
          const a = acaoDe(d.chave);
          return [d.chave, { acao: a.acao.trim() || null, responsavel: a.responsavel.trim() || null, prazo: a.prazo || null, prioridade: a.prioridade, status: a.status }];
        }),
      ),
    };
    iniciar(async () => {
      const r = await salvarVisitaAction(slug, entrada, visita?.id ?? null);
      if (r.success) {
        const planos = desvios.length > 0 ? ` ${desvios.length} ${desvios.length === 1 ? "desvio virou" : "desvios viraram"} plano${desvios.length === 1 ? "" : "s"} de ação.` : "";
        const ajuste = retirados.length > 0 ? ` ${retirados.length} ${retirados.length === 1 ? "plano foi retirado ou cancelado" : "planos foram retirados ou cancelados"} porque o item foi corrigido.` : "";
        aoSalvar({ tipo: "success", texto: `${editando ? "Visita atualizada." : "Visita salva no histórico."}${planos}${ajuste}` });
      } else aoSalvar({ tipo: "error", texto: r.error });
    });
  };

  const secoesAbertas = SECOES_QUALIDADE.map((_, i) => !fechadas.has(i));
  const algumaAberta = secoesAbertas.some(Boolean);

  return (
    <form id="ql-form" onSubmit={salvar} noValidate className="space-y-4">
      <SectionCard
        title={somenteLeitura ? "Visita de qualidade" : editando ? "Editar visita de qualidade" : "Checklist de qualidade da visita"}
        description={somenteLeitura ? "Somente leitura." : editando ? "Você está corrigindo uma visita já salva: ao salvar, ela é atualizada (não vira uma visita nova) e os planos de ação acompanham." : "34 itens em 6 seções. Marque Sim, Não ou N/A (clique de novo para limpar). Cada item “Não” vira um plano de ação."}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="ql-loja">Loja</Label>
            <NativeSelect id="ql-loja" value={lojaId} onChange={(e) => setLojaId(e.target.value)} disabled={somenteLeitura || visita != null} required>
              {lojas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
              {visita && !lojas.some((l) => l.id === visita.lojaId) ? <option value={visita.lojaId}>Loja</option> : null}
            </NativeSelect>
            {visita != null && !somenteLeitura ? <p className="text-[11px] text-muted-foreground">A loja de uma visita salva não muda.</p> : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="ql-data">Data da visita</Label>
            <Input id="ql-data" type="date" max={hoje} value={data} onChange={(e) => setData(e.target.value)} disabled={somenteLeitura} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ql-aval">Avaliador</Label>
            <Input id="ql-aval" maxLength={120} placeholder="Nome de quem visitou" value={avaliador} onChange={(e) => setAvaliador(e.target.value)} disabled={somenteLeitura} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ql-ger">Gerente da loja</Label>
            <Input id="ql-ger" maxLength={120} placeholder="Nome do gerente" value={gerente} onChange={(e) => setGerente(e.target.value)} disabled={somenteLeitura} />
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <SectionCard title="Nota da visita" description={`Nota = itens “Sim” ÷ itens avaliados (sem contar N/A). Na meta a partir de ${META_NOTA_QUALIDADE}%.`}>
          <div className="flex flex-wrap items-center gap-4">
            <Anel nota={resumo.nota} />
            <div className="text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">{resumo.sim}</strong> Sim · <strong className="text-foreground">{resumo.nao}</strong> Não · <strong className="text-foreground">{resumo.na}</strong> N/A
              </p>
              <p>
                {resumo.avaliados} de 34 itens avaliados
              </p>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Nota por seção">
          <ul className="space-y-2">
            {resumo.secoes.map((s) => (
              <li key={s.indice} className="grid grid-cols-[minmax(6rem,14rem)_1fr_3rem] items-center gap-3 text-sm">
                <span className="truncate" title={s.titulo}>
                  {s.rotulo}
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${s.rotulo}: ${formatarNota(s.nota)}`}>
                  <div className="h-full rounded-full" style={{ width: `${s.nota ?? 0}%`, backgroundColor: COR_STATUS[statusNota(s.nota)] }} />
                </div>
                <span className="text-right tabular-nums">{formatarNota(s.nota)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="flex justify-end print:hidden">
        <Button type="button" variant="outline" size="sm" onClick={() => setFechadas(algumaAberta ? new Set(SECOES_QUALIDADE.map((_, i) => i)) : new Set())}>
          {algumaAberta ? "Fechar tudo" : "Abrir tudo"}
        </Button>
      </div>

      {SECOES_QUALIDADE.map((sec, si) => {
        const rs = resumo.secoes[si];
        const aberta = !fechadas.has(si);
        return (
          <section key={sec.titulo} className="rounded-xl border border-border bg-card shadow-[var(--elevation-card)]">
            <button
              type="button"
              aria-expanded={aberta}
              aria-controls={`ql-sec-${si}`}
              onClick={() => setFechadas((s) => { const n = new Set(s); if (n.has(si)) n.delete(si); else n.add(si); return n; })}
              className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left print:cursor-default"
            >
              <span className="flex items-center gap-2 font-semibold">
                {aberta ? <ChevronDown className="size-4 print:hidden" aria-hidden /> : <ChevronRight className="size-4 print:hidden" aria-hidden />}
                {si + 1}. {sec.titulo}
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {rs?.avaliados ?? 0}/{sec.itens.length} avaliados
                </span>
                {rs && rs.nao > 0 ? <span className="rounded-full bg-red-500/10 px-2 py-0.5 font-medium text-red-700 dark:text-red-400">{rs.nao} não</span> : null}
              </span>
            </button>
            <ul id={`ql-sec-${si}`} className={`divide-y divide-border/60 border-t border-border px-4 ${aberta ? "" : "hidden print:block"}`}>
              {sec.itens.map((texto, ii) => {
                const k = chaveItem(si, ii);
                const r = respostas[k];
                return (
                  <li key={k} className={`grid gap-2 py-2.5 md:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)] md:items-center ${r?.v === "nao" ? "bg-red-500/5" : ""}`}>
                    <span className="text-sm">{texto}</span>
                    <div role="group" aria-label={texto} className="inline-flex w-fit overflow-hidden rounded-lg border border-border">
                      {RESPOSTAS_QUALIDADE.map((o) => {
                        const on = r?.v === o.v;
                        return (
                          <button
                            key={o.v}
                            type="button"
                            aria-pressed={on}
                            disabled={somenteLeitura}
                            onClick={() => marcar(k, o.v)}
                            className={`px-3 py-1 text-xs font-medium transition-colors disabled:cursor-default ${on ? (o.v === "nao" ? "bg-red-500/15 text-red-700 dark:text-red-400" : o.v === "sim" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-foreground") : "text-muted-foreground enabled:hover:bg-muted"}`}
                          >
                            {o.rotulo}
                          </button>
                        );
                      })}
                    </div>
                    <Input aria-label={`Evidência ou observação: ${texto}`} maxLength={300} placeholder="Evidência / observação" value={r?.o ?? ""} onChange={(e) => observar(k, e.target.value)} disabled={somenteLeitura} />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <SectionCard
        title="Plano de ação dos desvios"
        description={desvios.length > 0 ? `${desvios.length} ${desvios.length === 1 ? "item com “Não”" : "itens com “Não”"}. Ao salvar, cada desvio entra na lista central de planos de ação.` : undefined}
      >
        {desvios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum desvio marcado. Os itens com &quot;Não&quot; aparecem aqui para virar plano de ação.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Desvio</th>
                  <th className="py-2 pr-3 font-medium">Ação</th>
                  <th className="py-2 pr-3 font-medium">Responsável</th>
                  <th className="py-2 pr-3 font-medium">Prazo</th>
                  <th className="py-2 pr-3 font-medium">Prioridade</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {desvios.map((d) => {
                  const a = acaoDe(d.chave);
                  const existente = planoDe(d.chave);
                  const statusOpcoes: StatusPlano[] = existente?.status === "cancelado" ? ["pendente", "em_andamento", "concluido", "cancelado"] : ["pendente", "em_andamento", "concluido"];
                  return (
                    <tr key={d.chave} className="border-b border-border/60 align-top last:border-0">
                      <td className="min-w-52 py-2 pr-3">
                        <b>{d.titulo}</b>
                        <div className="text-xs text-muted-foreground">{d.secaoTitulo}</div>
                        {d.observacao ? <div className="mt-0.5 text-xs italic text-muted-foreground">{d.observacao}</div> : null}
                        {existente && verPlanos ? (
                          <Link href={`/${slug}/rede/planos?plano=${existente.id}&situacao=todas`} className="mt-0.5 inline-block text-xs underline underline-offset-2 print:hidden">
                            Já é um plano de ação
                          </Link>
                        ) : null}
                      </td>
                      <td className="min-w-56 py-2 pr-3">
                        <Input aria-label={`Ação: ${d.titulo}`} maxLength={600} placeholder="O que será feito" value={a.acao} onChange={(e) => mudarAcao(d.chave, "acao", e.target.value)} disabled={somenteLeitura} />
                      </td>
                      <td className="min-w-40 py-2 pr-3">
                        <Input aria-label={`Responsável: ${d.titulo}`} maxLength={120} placeholder="Quem" value={a.responsavel} onChange={(e) => mudarAcao(d.chave, "responsavel", e.target.value)} disabled={somenteLeitura} />
                      </td>
                      <td className="py-2 pr-3">
                        <Input aria-label={`Prazo: ${d.titulo}`} type="date" value={a.prazo} onChange={(e) => mudarAcao(d.chave, "prazo", e.target.value)} disabled={somenteLeitura} />
                      </td>
                      <td className="py-2 pr-3">
                        <NativeSelect aria-label={`Prioridade: ${d.titulo}`} value={a.prioridade} onChange={(e) => mudarAcao(d.chave, "prioridade", e.target.value)} disabled={somenteLeitura}>
                          {PRIORIDADES_PLANO.map((p) => (
                            <option key={p.v} value={p.v}>
                              {p.rotulo}
                            </option>
                          ))}
                        </NativeSelect>
                      </td>
                      <td className="py-2">
                        <NativeSelect aria-label={`Status: ${d.titulo}`} value={a.status} onChange={(e) => mudarAcao(d.chave, "status", e.target.value)} disabled={somenteLeitura}>
                          {statusOpcoes.map((s) => (
                            <option key={s} value={s}>
                              {rotuloStatusPlano(s)}
                            </option>
                          ))}
                        </NativeSelect>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {retirados.length > 0 && !somenteLeitura ? (
          <div className="mt-3">
            <FeedbackMessage variant="info">
              {retirados.length === 1 ? "1 plano de ação desta visita deixa" : `${retirados.length} planos de ação desta visita deixam`} de valer porque o item deixou de ser “Não”: o que ainda não saiu do papel é removido; o que já tem ação é cancelado, com uma nota.
            </FeedbackMessage>
          </div>
        ) : null}
        {bloqueado ? (
          <div className="mt-3">
            <FeedbackMessage variant="error">Esta visita tem itens com “Não”, que geram planos de ação, e o seu perfil não pode criar ou alterar planos. Peça ao administrador para liberar “Planos de ação”.</FeedbackMessage>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          {!somenteLeitura ? (
            <Button type="button" variant="outline" onClick={limpar} disabled={pendente}>
              Limpar
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden /> Imprimir
          </Button>
          {visita ? (
            <Button type="button" variant="outline" onClick={aoFechar} disabled={pendente}>
              {somenteLeitura ? "Fechar" : "Cancelar edição"}
            </Button>
          ) : null}
          {!somenteLeitura ? (
            <Button type="submit" disabled={pendente || lojas.length === 0 || bloqueado}>
              {pendente ? "Salvando…" : editando ? "Salvar alterações" : "Salvar visita"}
            </Button>
          ) : null}
        </div>
      </SectionCard>
    </form>
  );
}
