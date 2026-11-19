"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { History, Pencil, Plus, ShieldCheck, Trash2, Eye } from "lucide-react";

import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { CabecalhoImpressao } from "@/components/rede/cabecalho-impressao";
import { KpiCard } from "@/components/rede/kpi-card";
import { StatusPill } from "@/components/rede/status";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SectionCard } from "@/components/ui/section-card";
import { Textarea } from "@/components/ui/textarea";
import { atualizarPlanoAction, criarPlanoAction, excluirPlanoAction, historicoPlanoAction, verificarPlanoAction } from "@/lib/rede/actions-planos";
import { LINHAS_NO_HISTORICO } from "@/lib/rede/cozinha";
import { descreverUnidades, type RelatorioMeta } from "@/lib/rede/relatorio";
import {
  FILTRO_VAZIO,
  ORIGENS_PLANO,
  PRIORIDADES_PLANO,
  SITUACOES_FILTRO,
  STATUS_PLANO,
  aguardaVerificacao,
  diasDeAtraso,
  filtrarPlanos,
  linhasCsvPlanos,
  ordenarPlanos,
  pendenciasPorLoja,
  resumirPlanos,
  rotuloOrigem,
  rotuloPrioridade,
  rotuloSituacao,
  situacaoPlano,
  tomDaSituacao,
  type FiltroPlanos,
  type ItemHistoricoPlano,
} from "@/lib/rede/planos";
import { INDICADORES, type PlanoAcao, type PrioridadePlano, type StatusPlano } from "@/lib/rede/tipos";

type Msg = { tipo: "success" | "error"; texto: string } | null;
type LojaRef = { id: string; nome: string };

const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const nf1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

type NovoInicial = { origemTipo: "manual" | "indicador"; lojaId: string | null; descricao: string; origemRotulo: string };

type Props = {
  slug: string;
  cliente: string;
  /** Lojas onde se cria plano (operando ou em inauguração). */
  lojas: LojaRef[];
  /** Todas as lojas do acesso (inclui as inativas, que ainda têm planos no histórico). */
  todasLojas: LojaRef[];
  planos: PlanoAcao[];
  hoje: string;
  geradoEm: string;
  /** A pessoa só enxerga parte da rede (o cabeçalho diz "Lojas do seu acesso"). */
  escopoParcial?: boolean;
  editavel: boolean;
  podeVerificar: boolean;
  podeVerHistorico: boolean;
  filtroInicial: FiltroPlanos;
  abrirId: string | null;
  novo: NovoInicial | null;
};

export function PlanosGestao({ slug, cliente, lojas, todasLojas, planos, hoje, geradoEm, escopoParcial = false, editavel, podeVerificar, podeVerHistorico, filtroInicial, abrirId, novo }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [filtro, setFiltro] = useState<FiltroPlanos>(filtroInicial);
  const [aberto, setAberto] = useState<PlanoAcao | null>(abrirId ? (planos.find((p) => p.id === abrirId) ?? null) : null);
  const [criando, setCriando] = useState(novo != null);
  const [excluir, setExcluir] = useState<PlanoAcao | null>(null);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  const nomes = useMemo(() => new Map(todasLojas.map((l) => [l.id, l.nome] as const)), [todasLojas]);
  const nome = (id: string) => nomes.get(id) ?? "Loja";

  const doEscopo = useMemo(() => (filtro.loja ? planos.filter((p) => p.lojaId === filtro.loja) : planos), [planos, filtro.loja]);
  const resumo = useMemo(() => resumirPlanos(doEscopo, hoje), [doEscopo, hoje]);
  const pendencias = useMemo(() => pendenciasPorLoja(planos, hoje), [planos, hoje]);
  const lista = useMemo(() => ordenarPlanos(filtrarPlanos(planos, filtro, hoje, (id) => nomes.get(id) ?? ""), hoje), [planos, filtro, hoje, nomes]);
  const visiveis = lista.slice(0, LINHAS_NO_HISTORICO);
  const alteradoFiltro = filtro.loja != null || filtro.situacao !== FILTRO_VAZIO.situacao || filtro.origem !== "todas" || filtro.prioridade !== "todas" || filtro.texto !== "" || filtro.origemId != null;

  const textoFiltros = [
    `Situação: ${SITUACOES_FILTRO.find((s) => s.v === filtro.situacao)?.rotulo ?? "Todos"}`,
    filtro.origem !== "todas" ? `Origem: ${rotuloOrigem(filtro.origem)}` : null,
    filtro.prioridade !== "todas" ? `Prioridade: ${rotuloPrioridade(filtro.prioridade)}` : null,
    filtro.texto ? `Busca: “${filtro.texto}”` : null,
    `Posição em ${dmy(hoje)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const meta: RelatorioMeta = {
    titulo: "Planos de ação",
    cliente,
    filtros: textoFiltros,
    unidades: filtro.loja ? nome(filtro.loja) : descreverUnidades(todasLojas.map((l) => l.nome), false, escopoParcial),
    origemDados: "Planos de ação registrados no Gestão no Foco (checklists de qualidade e de delivery, indicadores e lançamentos manuais)",
  };

  const verificar = (p: PlanoAcao) => {
    setMsg(null);
    iniciar(async () => {
      const r = await verificarPlanoAction(slug, p.id);
      if (r.success) {
        setMsg({ tipo: "success", texto: "Conclusão verificada." });
        setAberto(null);
        router.refresh();
      } else setMsg({ tipo: "error", texto: r.error });
    });
  };

  const confirmarExclusao = () => {
    if (!excluir) return;
    setErroExcluir(null);
    iniciar(async () => {
      const r = await excluirPlanoAction(slug, excluir.id);
      if (r.success) {
        setExcluir(null);
        if (aberto?.id === excluir.id) setAberto(null);
        setMsg({ tipo: "success", texto: "Plano excluído." });
        router.refresh();
      } else setErroExcluir(r.error);
    });
  };

  const abrir = (p: PlanoAcao) => {
    setMsg(null);
    setAberto(p);
    window.setTimeout(() => document.getElementById("pl-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  return (
    <div className="space-y-5">
      <CabecalhoImpressao titulo={meta.titulo} cliente={meta.cliente} filtros={meta.filtros} unidades={meta.unidades} geradoEm={geradoEm} origemDados={meta.origemDados} />

      {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard rotulo="Planos em aberto" valor={String(resumo.abertos)} detalhe={`${resumo.pendentes} ${resumo.pendentes === 1 ? "pendente" : "pendentes"} · ${resumo.emAndamento} em andamento`} tom={resumo.abertos > 0 ? "atencao" : "ok"} />
        <KpiCard rotulo="Atrasados" valor={String(resumo.atrasados)} detalhe={resumo.atrasados > 0 ? "Prazo vencido e ainda aberto" : "Nenhum prazo vencido"} tom={resumo.atrasados > 0 ? "critico" : "ok"} />
        <KpiCard rotulo="Aguardando verificação" valor={String(resumo.aguardandoVerificacao)} detalhe={resumo.aguardandoVerificacao > 0 ? "Concluídos, sem verificação" : "Tudo o que foi concluído foi verificado"} tom={resumo.aguardandoVerificacao > 0 ? "atencao" : "ok"} />
        <KpiCard
          rotulo="Taxa de conclusão"
          valor={resumo.taxaConclusao == null ? "—" : `${nf1.format(resumo.taxaConclusao)}%`}
          detalhe={resumo.taxaConclusao == null ? "Sem planos para contar" : `${resumo.concluidos} concluídos de ${resumo.concluidos + resumo.abertos} (cancelados não contam)`}
          progresso={resumo.taxaConclusao}
          tom={resumo.taxaConclusao == null ? "neutro" : resumo.taxaConclusao >= 80 ? "ok" : resumo.taxaConclusao >= 50 ? "atencao" : "critico"}
        />
      </div>

      {pendencias.length > 0 ? (
        <SectionCard title="Pendências por loja" description="Planos abertos e a verificar, das lojas mais críticas para as menos. Clique em uma loja para filtrar.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Loja</th>
                  <th className="py-2 pr-3 text-right font-medium">Em aberto</th>
                  <th className="py-2 pr-3 text-right font-medium">Atrasados</th>
                  <th className="py-2 text-right font-medium">A verificar</th>
                </tr>
              </thead>
              <tbody>
                {pendencias.map((p) => (
                  <tr key={p.lojaId} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-medium">
                      <button type="button" className="underline-offset-2 hover:underline" onClick={() => setFiltro((f) => ({ ...f, loja: f.loja === p.lojaId ? null : p.lojaId }))} aria-pressed={filtro.loja === p.lojaId}>
                        {nome(p.lojaId)}
                      </button>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{p.abertos}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{p.atrasados > 0 ? <StatusPill status="bad">{p.atrasados}</StatusPill> : 0}</td>
                    <td className="py-2 text-right tabular-nums">{p.aguardandoVerificacao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {editavel ? (
        criando ? (
          <FormularioNovo
            key="novo"
            slug={slug}
            lojas={lojas}
            planos={planos}
            hoje={hoje}
            inicial={novo}
            lojaInicial={filtro.loja}
            pendente={pendente}
            iniciar={iniciar}
            aoSalvar={(m) => {
              setMsg(m);
              if (m.tipo === "success") {
                setCriando(false);
                router.refresh();
              }
            }}
            aoCancelar={() => setCriando(false)}
          />
        ) : (
          <div className="print:hidden">
            <Button type="button" onClick={() => { setMsg(null); setCriando(true); }}>
              <Plus aria-hidden /> Novo plano de ação
            </Button>
          </div>
        )
      ) : null}

      {aberto ? (
        <EditorPlano
          key={aberto.id}
          slug={slug}
          plano={aberto}
          nomeLoja={nome(aberto.lojaId)}
          hoje={hoje}
          somenteLeitura={!editavel}
          podeVerificar={podeVerificar && editavel}
          podeVerHistorico={podeVerHistorico}
          pendente={pendente}
          iniciar={iniciar}
          aoVerificar={() => verificar(aberto)}
          aoExcluir={() => { setErroExcluir(null); setExcluir(aberto); }}
          aoSalvar={(m) => {
            setMsg(m);
            if (m.tipo === "success") {
              setAberto(null);
              router.refresh();
            }
          }}
          aoFechar={() => setAberto(null)}
        />
      ) : null}

      <SectionCard
        title="Planos de ação"
        description={lista.length > visiveis.length ? `Mostrando os ${visiveis.length} primeiros de ${lista.length}. A exportação leva todos os do filtro.` : `${lista.length} ${lista.length === 1 ? "plano" : "planos"} no filtro. Abertos e a verificar aparecem sempre; concluídos e cancelados, dos últimos 180 dias.`}
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 print:hidden">
          <div className="space-y-1">
            <Label htmlFor="pl-f-loja">Loja</Label>
            <NativeSelect id="pl-f-loja" value={filtro.loja ?? ""} onChange={(e) => setFiltro((f) => ({ ...f, loja: e.target.value || null }))}>
              <option value="">Rede toda</option>
              {todasLojas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pl-f-sit">Situação</Label>
            <NativeSelect id="pl-f-sit" value={filtro.situacao} onChange={(e) => setFiltro((f) => ({ ...f, situacao: e.target.value as FiltroPlanos["situacao"] }))}>
              {SITUACOES_FILTRO.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.rotulo}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pl-f-ori">Origem</Label>
            <NativeSelect id="pl-f-ori" value={filtro.origem} onChange={(e) => setFiltro((f) => ({ ...f, origem: e.target.value as FiltroPlanos["origem"] }))}>
              <option value="todas">Todas</option>
              {ORIGENS_PLANO.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.rotulo}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pl-f-pri">Prioridade</Label>
            <NativeSelect id="pl-f-pri" value={filtro.prioridade} onChange={(e) => setFiltro((f) => ({ ...f, prioridade: e.target.value as FiltroPlanos["prioridade"] }))}>
              <option value="todas">Todas</option>
              {PRIORIDADES_PLANO.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.rotulo}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pl-f-q">Buscar</Label>
            <Input id="pl-f-q" type="search" maxLength={120} placeholder="Problema, ação, responsável…" value={filtro.texto} onChange={(e) => setFiltro((f) => ({ ...f, texto: e.target.value }))} />
          </div>
        </div>
        {filtro.origemId ? (
          <div className="mb-3 print:hidden">
            <FeedbackMessage variant="info">
              Mostrando só os planos de um registro (visita ou checklist).{" "}
              <button type="button" className="underline underline-offset-2" onClick={() => setFiltro((f) => ({ ...f, origemId: null }))}>
                Ver todos
              </button>
            </FeedbackMessage>
          </div>
        ) : null}
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <AcoesExportar arquivo="planos-de-acao-fat-buddha.csv" linhas={linhasCsvPlanos(lista, nome, hoje)} meta={meta} />
          {alteradoFiltro ? (
            <Button type="button" variant="ghost" size="sm" className="print:hidden" onClick={() => setFiltro({ ...FILTRO_VAZIO })}>
              Limpar filtros
            </Button>
          ) : null}
        </div>

        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">{planos.length === 0 ? "Nenhum plano de ação ainda. Eles nascem dos itens “Não” do checklist de qualidade, dos desvios do checklist de delivery ou são lançados à mão." : "Nenhum plano com esses filtros."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Loja</th>
                  <th className="py-2 pr-3 font-medium">Origem</th>
                  <th className="py-2 pr-3 font-medium">Problema</th>
                  <th className="py-2 pr-3 font-medium">Ação</th>
                  <th className="py-2 pr-3 font-medium">Responsável</th>
                  <th className="py-2 pr-3 font-medium">Prazo</th>
                  <th className="py-2 pr-3 font-medium">Prioridade</th>
                  <th className="py-2 pr-3 font-medium">Situação</th>
                  <th className="py-2 text-right font-medium print:hidden">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((p) => {
                  const sit = situacaoPlano(p, hoje);
                  const atraso = diasDeAtraso(p, hoje);
                  return (
                    <tr key={p.id} className={`border-b border-border/60 align-top last:border-0 ${sit === "atrasado" ? "bg-red-500/5" : ""}`}>
                      <td className="py-2 pr-3 font-medium">{nome(p.lojaId)}</td>
                      <td className="min-w-40 py-2 pr-3">
                        <div>{rotuloOrigem(p.origemTipo)}</div>
                        <div className="text-xs text-muted-foreground">{p.origemRotulo}</div>
                      </td>
                      <td className="min-w-56 py-2 pr-3">{p.descricao}</td>
                      <td className="min-w-48 py-2 pr-3">{p.acao ?? <span className="text-muted-foreground">Sem ação definida</span>}</td>
                      <td className="py-2 pr-3">{p.responsavel ?? "—"}</td>
                      <td className="py-2 pr-3 whitespace-nowrap tabular-nums">
                        {p.prazo ? dmy(p.prazo) : "—"}
                        {atraso > 0 ? <div className="text-xs text-red-700 dark:text-red-400">{atraso} {atraso === 1 ? "dia" : "dias"} de atraso</div> : null}
                      </td>
                      <td className="py-2 pr-3">{rotuloPrioridade(p.prioridade)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <StatusPill status={tomDaSituacao(sit)}>{rotuloSituacao(sit)}</StatusPill>
                        {p.status === "concluido" ? <div className="mt-0.5 text-xs text-muted-foreground">{p.verificadoEm ? "Verificado" : "A verificar"}{p.dataConclusao ? ` · ${dmy(p.dataConclusao)}` : ""}</div> : null}
                      </td>
                      <td className="py-1 text-right whitespace-nowrap print:hidden">
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`${editavel ? "Abrir" : "Ver"} o plano: ${p.descricao}`} onClick={() => abrir(p)}>
                          {editavel ? <Pencil aria-hidden /> : <Eye aria-hidden />}
                        </Button>
                        {editavel && podeVerificar && aguardaVerificacao(p) ? (
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Verificar a conclusão do plano: ${p.descricao}`} onClick={() => verificar(p)} disabled={pendente}>
                            <ShieldCheck aria-hidden />
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
        title="Excluir este plano de ação?"
        description={excluir ? `${nome(excluir.lojaId)} · ${excluir.descricao}. A exclusão fica registrada no histórico de alterações.` : ""}
        confirmLabel="Excluir"
        loading={pendente}
        error={erroExcluir}
        onConfirm={confirmarExclusao}
      />
    </div>
  );
}

/* ============================================================ novo plano */

type NovoProps = {
  slug: string;
  lojas: LojaRef[];
  planos: PlanoAcao[];
  hoje: string;
  inicial: NovoInicial | null;
  lojaInicial: string | null;
  pendente: boolean;
  iniciar: (fn: () => void) => void;
  aoSalvar: (m: NonNullable<Msg>) => void;
  aoCancelar: () => void;
};

function FormularioNovo({ slug, lojas, planos, hoje, inicial, lojaInicial, pendente, iniciar, aoSalvar, aoCancelar }: NovoProps) {
  const [lojaId, setLojaId] = useState(inicial?.lojaId ?? (lojaInicial && lojas.some((l) => l.id === lojaInicial) ? lojaInicial : (lojas[0]?.id ?? "")));
  const [origemTipo, setOrigemTipo] = useState<"manual" | "indicador">(inicial?.origemTipo ?? "manual");
  const [indicador, setIndicador] = useState(inicial?.origemRotulo ?? "");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [acao, setAcao] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [prazo, setPrazo] = useState("");
  const [prioridade, setPrioridade] = useState<PrioridadePlano>("media");
  const [status, setStatus] = useState<"pendente" | "em_andamento">("pendente");
  const [obs, setObs] = useState("");

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    iniciar(async () => {
      const r = await criarPlanoAction(slug, {
        lojaId,
        origemTipo,
        origemRotulo: origemTipo === "indicador" ? indicador.trim() || null : null,
        descricao,
        acao: acao.trim() || null,
        responsavel: responsavel.trim() || null,
        prazo: prazo || null,
        prioridade,
        status,
        observacoes: obs.trim() || null,
      });
      if (r.success) aoSalvar({ tipo: "success", texto: "Plano de ação criado." });
      else aoSalvar({ tipo: "error", texto: r.error });
    });
  };

  const parecido = planos.find((p) => p.lojaId === lojaId && (p.status === "pendente" || p.status === "em_andamento") && p.descricao.trim().toLowerCase() === descricao.trim().toLowerCase());

  return (
    <form id="pl-novo" onSubmit={salvar} noValidate className="print:hidden">
      <SectionCard title="Novo plano de ação" description="Para problemas que não vieram de um checklist: uma visita informal, uma reclamação, um indicador fora da meta.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="pn-loja">Loja</Label>
            <NativeSelect id="pn-loja" value={lojaId} onChange={(e) => setLojaId(e.target.value)} required>
              {lojas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pn-origem">Origem</Label>
            <NativeSelect id="pn-origem" value={origemTipo} onChange={(e) => setOrigemTipo(e.target.value as "manual" | "indicador")}>
              <option value="manual">Lançado à mão</option>
              <option value="indicador">Indicador fora da meta</option>
            </NativeSelect>
          </div>
          {origemTipo === "indicador" ? (
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="pn-ind">Indicador</Label>
              <Input id="pn-ind" list="pn-indicadores" maxLength={200} placeholder="Ex.: CMV, Tempo de preparo" value={indicador} onChange={(e) => setIndicador(e.target.value)} />
              <datalist id="pn-indicadores">
                {INDICADORES.map((i) => (
                  <option key={i.k} value={i.nome} />
                ))}
              </datalist>
            </div>
          ) : null}
          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="pn-desc">Descrição do problema</Label>
            <Input id="pn-desc" maxLength={500} placeholder="O que aconteceu ou o que está fora do padrão" value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
            {parecido ? <p className="text-[11px] text-amber-700 dark:text-amber-400">Já existe um plano em aberto nesta loja com essa descrição: ao salvar, o sistema vai recusar para não duplicar.</p> : null}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="pn-acao">Ação corretiva</Label>
            <Input id="pn-acao" maxLength={600} placeholder="O que será feito" value={acao} onChange={(e) => setAcao(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pn-resp">Responsável</Label>
            <Input id="pn-resp" maxLength={120} placeholder="Quem" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pn-prazo">Prazo</Label>
            <Input id="pn-prazo" type="date" min={hoje} value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pn-pri">Prioridade</Label>
            <NativeSelect id="pn-pri" value={prioridade} onChange={(e) => setPrioridade(e.target.value as PrioridadePlano)}>
              {PRIORIDADES_PLANO.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.rotulo}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pn-status">Situação</Label>
            <NativeSelect id="pn-status" value={status} onChange={(e) => setStatus(e.target.value as "pendente" | "em_andamento")}>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em andamento</option>
            </NativeSelect>
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="pn-obs">Observações</Label>
            <Textarea id="pn-obs" rows={2} maxLength={1000} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={aoCancelar} disabled={pendente}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pendente || lojas.length === 0}>
            {pendente ? "Salvando…" : "Criar plano"}
          </Button>
        </div>
      </SectionCard>
    </form>
  );
}

/* ============================================================ editor do plano */

type EditorProps = {
  slug: string;
  plano: PlanoAcao;
  nomeLoja: string;
  hoje: string;
  somenteLeitura: boolean;
  podeVerificar: boolean;
  podeVerHistorico: boolean;
  pendente: boolean;
  iniciar: (fn: () => void) => void;
  aoVerificar: () => void;
  aoExcluir: () => void;
  aoSalvar: (m: NonNullable<Msg>) => void;
  aoFechar: () => void;
};

function EditorPlano({ slug, plano, nomeLoja, hoje, somenteLeitura, podeVerificar, podeVerHistorico, pendente, iniciar, aoVerificar, aoExcluir, aoSalvar, aoFechar }: EditorProps) {
  const livre = plano.origemTipo === "manual" || plano.origemTipo === "indicador";
  const [descricao, setDescricao] = useState(plano.descricao);
  const [acao, setAcao] = useState(plano.acao ?? "");
  const [responsavel, setResponsavel] = useState(plano.responsavel ?? "");
  const [prazo, setPrazo] = useState(plano.prazo ?? "");
  const [prioridade, setPrioridade] = useState<PrioridadePlano>(plano.prioridade);
  const [status, setStatus] = useState<StatusPlano>(plano.status);
  const [evidencia, setEvidencia] = useState(plano.evidencia ?? "");
  const [obs, setObs] = useState(plano.observacoes ?? "");
  const [historico, setHistorico] = useState<ItemHistoricoPlano[] | null>(null);
  const [erroHistorico, setErroHistorico] = useState<string | null>(null);

  const sit = situacaoPlano({ status, prazo: prazo || null }, hoje);
  const origemHref = plano.origemId ? (plano.origemTipo === "qualidade" ? `/${slug}/rede/qualidade?visita=${plano.origemId}` : plano.origemTipo === "delivery" ? `/${slug}/rede/delivery` : null) : null;
  const mudouConteudoVerificado = plano.verificadoEm != null && (acao.trim() !== (plano.acao ?? "") || evidencia.trim() !== (plano.evidencia ?? "") || status !== "concluido");

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (somenteLeitura) return;
    iniciar(async () => {
      const r = await atualizarPlanoAction(slug, plano.id, {
        descricao: livre ? descricao : undefined,
        acao: acao.trim() || null,
        responsavel: responsavel.trim() || null,
        prazo: prazo || null,
        prioridade,
        status,
        evidencia: evidencia.trim() || null,
        observacoes: obs.trim() || null,
      });
      if (r.success) aoSalvar({ tipo: "success", texto: "Plano de ação atualizado." });
      else aoSalvar({ tipo: "error", texto: r.error });
    });
  };

  const carregarHistorico = () => {
    setErroHistorico(null);
    iniciar(async () => {
      const r = await historicoPlanoAction(slug, plano.id);
      if (r.success) setHistorico(r.itens);
      else setErroHistorico(r.error);
    });
  };

  return (
    <form id="pl-editor" onSubmit={salvar} noValidate className="print:hidden">
      <SectionCard title={somenteLeitura ? "Plano de ação" : "Editar plano de ação"} description={`${nomeLoja} · ${rotuloOrigem(plano.origemTipo)} · ${plano.origemRotulo}`}>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <StatusPill status={tomDaSituacao(sit)}>{rotuloSituacao(sit)}</StatusPill>
          {plano.status === "concluido" ? <span className="text-xs text-muted-foreground">{plano.verificadoEm ? `Verificado em ${dmy(plano.verificadoEm.slice(0, 10))}` : "Concluído, ainda sem verificação"}{plano.dataConclusao ? ` · concluído em ${dmy(plano.dataConclusao)}` : ""}</span> : null}
          {origemHref ? (
            <Link href={origemHref} className="text-xs underline underline-offset-2">
              Abrir o registro de origem
            </Link>
          ) : plano.origemTipo === "qualidade" || plano.origemTipo === "delivery" ? (
            <span className="text-xs text-muted-foreground">O registro de origem foi excluído; o plano continua valendo.</span>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="pe-desc">Descrição do problema</Label>
            <Input id="pe-desc" maxLength={500} value={descricao} onChange={(e) => setDescricao(e.target.value)} disabled={somenteLeitura || !livre} />
            {!livre && !somenteLeitura ? <p className="text-[11px] text-muted-foreground">Nos planos que vieram de um checklist, a descrição é o desvio e não muda aqui.</p> : null}
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="pe-acao">Ação corretiva</Label>
            <Input id="pe-acao" maxLength={600} placeholder="O que será feito" value={acao} onChange={(e) => setAcao(e.target.value)} disabled={somenteLeitura} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pe-resp">Responsável</Label>
            <Input id="pe-resp" maxLength={120} placeholder="Quem" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} disabled={somenteLeitura} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pe-prazo">Prazo</Label>
            <Input id="pe-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} disabled={somenteLeitura} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pe-pri">Prioridade</Label>
            <NativeSelect id="pe-pri" value={prioridade} onChange={(e) => setPrioridade(e.target.value as PrioridadePlano)} disabled={somenteLeitura}>
              {PRIORIDADES_PLANO.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.rotulo}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pe-status">Situação</Label>
            <NativeSelect id="pe-status" value={status} onChange={(e) => setStatus(e.target.value as StatusPlano)} disabled={somenteLeitura}>
              {STATUS_PLANO.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.rotulo}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="pe-evid">Evidência da conclusão</Label>
            <Input id="pe-evid" maxLength={600} placeholder="O que comprova que foi resolvido (foto, nota, registro…)" value={evidencia} onChange={(e) => setEvidencia(e.target.value)} disabled={somenteLeitura} />
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="pe-obs">Observações</Label>
            <Textarea id="pe-obs" rows={2} maxLength={1000} value={obs} onChange={(e) => setObs(e.target.value)} disabled={somenteLeitura} />
          </div>
        </div>
        {mudouConteudoVerificado && !somenteLeitura ? (
          <div className="mt-3">
            <FeedbackMessage variant="info">Este plano já foi verificado. Mudar a ação, a evidência ou a situação derruba a verificação: será preciso verificar de novo.</FeedbackMessage>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={aoFechar} disabled={pendente}>
            {somenteLeitura ? "Fechar" : "Cancelar"}
          </Button>
          {!somenteLeitura ? (
            <Button type="submit" disabled={pendente}>
              {pendente ? "Salvando…" : "Salvar alterações"}
            </Button>
          ) : null}
          {podeVerificar && plano.status === "concluido" && !plano.verificadoEm ? (
            <Button type="button" variant="outline" onClick={aoVerificar} disabled={pendente}>
              <ShieldCheck aria-hidden /> Verificar conclusão
            </Button>
          ) : null}
          {!somenteLeitura && livre ? (
            <Button type="button" variant="outline" onClick={aoExcluir} disabled={pendente}>
              <Trash2 aria-hidden /> Excluir
            </Button>
          ) : null}
          {podeVerHistorico ? (
            <Button type="button" variant="ghost" onClick={carregarHistorico} disabled={pendente}>
              <History aria-hidden /> Histórico de alterações
            </Button>
          ) : null}
        </div>
        {erroHistorico ? (
          <div className="mt-3">
            <FeedbackMessage variant="error">{erroHistorico}</FeedbackMessage>
          </div>
        ) : null}
        {historico ? (
          historico.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nenhuma alteração registrada.</p>
          ) : (
            <ol className="mt-4 space-y-2 border-t border-border pt-3 text-sm" aria-label="Histórico de alterações do plano">
              {historico.map((h) => (
                <li key={h.id}>
                  <div className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(h.quando))} · {h.usuario}
                  </div>
                  {h.mudancas.length === 0 ? <div>Alteração sem mudança de conteúdo</div> : h.mudancas.map((m) => <div key={m}>{m}</div>)}
                </li>
              ))}
            </ol>
          )
        ) : null}
      </SectionCard>
    </form>
  );
}
