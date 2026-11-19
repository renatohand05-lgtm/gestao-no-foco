"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Pencil, Printer, Trash2 } from "lucide-react";

import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { StatusPill } from "@/components/rede/status";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SectionCard } from "@/components/ui/section-card";
import { Textarea } from "@/components/ui/textarea";
import { excluirDeliveryAction, salvarDeliveryAction } from "@/lib/rede/actions-cozinha";
import { formatarValor, somarDias } from "@/lib/rede/calculo";
import { LINHAS_NO_HISTORICO } from "@/lib/rede/cozinha";
import { lerNumero } from "@/lib/rede/csv";
import {
  ACOMPANHAMENTOS_DELIVERY,
  ROTINA_DELIVERY,
  METAS_DELIVERY,
  avaliarRegistro,
  dataDoRegistro,
  linhasCsvDelivery,
  metaDoDelivery,
  resumirRotina,
  textoMetaDelivery,
  type CampoAcomp,
  type CampoMeta,
} from "@/lib/rede/delivery";
import { segundaDaSemana } from "@/lib/rede/financeiro";
import type { MetaRow, PeriodoDelivery, RegistroDelivery, RespostaRotina, Status } from "@/lib/rede/tipos";

type Msg = { tipo: "success" | "error"; texto: string } | null;
type LojaRef = { id: string; nome: string };

const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const texto = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));
const ROTULO_STATUS: Record<Status, string> = { ok: "Na meta", warn: "Atenção", bad: "Fora", neu: "—" };
const RESPOSTAS: { v: RespostaRotina; rotulo: string }[] = [
  { v: "sim", rotulo: "Sim" },
  { v: "nao", rotulo: "Não" },
  { v: "na", rotulo: "N/A" },
];

type Props = {
  slug: string;
  lojas: LojaRef[];
  /** Histórico (mais recente primeiro) das lojas do filtro. */
  registros: RegistroDelivery[];
  metas: MetaRow[];
  tolPct: number;
  hoje: string;
  editavel: boolean;
  /** Rupturas registradas na cozinha central por loja e semana; null = o perfil não vê rupturas. */
  rupturasPorSemana: Record<string, number> | null;
  /** Loja pré-selecionada (filtro da tela). */
  lojaInicial: string | null;
};

export function DeliveryGestao({ slug, lojas, registros, metas, tolPct, hoje, editavel, rupturasPorSemana, lojaInicial }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [editando, setEditando] = useState<RegistroDelivery | null>(null);
  const [excluir, setExcluir] = useState<RegistroDelivery | null>(null);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  const nomeLoja = useMemo(() => new Map(lojas.map((l) => [l.id, l.nome] as const)), [lojas]);
  const nome = (id: string) => nomeLoja.get(id) ?? "Loja";
  const visiveis = registros.slice(0, LINHAS_NO_HISTORICO);

  const confirmarExclusao = () => {
    if (!excluir) return;
    setErroExcluir(null);
    iniciar(async () => {
      const r = await excluirDeliveryAction(slug, excluir.id);
      if (r.success) {
        setExcluir(null);
        if (editando?.id === excluir.id) setEditando(null);
        setMsg({ tipo: "success", texto: "Checklist excluído." });
        router.refresh();
      } else setErroExcluir(r.error);
    });
  };

  return (
    <div className="space-y-5">
      {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}

      {editavel ? (
        <FormularioDelivery
          key={editando?.id ?? "novo"}
          slug={slug}
          lojas={lojas}
          registros={registros}
          metas={metas}
          tolPct={tolPct}
          hoje={hoje}
          editando={editando}
          rupturasPorSemana={rupturasPorSemana}
          lojaInicial={lojaInicial}
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
      ) : (
        <FeedbackMessage variant="info">Seu perfil pode consultar os checklists de delivery, mas não lançar ou alterar.</FeedbackMessage>
      )}

      <SectionCard title="Histórico" description={registros.length > visiveis.length ? `Mostrando os ${visiveis.length} mais recentes de ${registros.length}. A exportação leva todos.` : `${registros.length} ${registros.length === 1 ? "checklist" : "checklists"} nos últimos 400 dias.`}>
        <div className="mb-3">
          <AcoesExportar arquivo="checklist-delivery-fat-buddha.csv" linhas={linhasCsvDelivery(registros, nome)} />
        </div>
        {registros.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum checklist salvo ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Data</th>
                  <th className="py-2 pr-3 font-medium">Loja</th>
                  <th className="py-2 pr-3 font-medium">Período</th>
                  <th className="py-2 pr-3 font-medium">Responsável</th>
                  {METAS_DELIVERY.map((m) => (
                    <th key={m.k} className="py-2 pr-3 text-right font-medium">
                      {m.nome}
                    </th>
                  ))}
                  <th className="py-2 pr-3 text-right font-medium">Rotina</th>
                  {editavel ? <th className="py-2 text-right font-medium">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {visiveis.map((v) => {
                  const av = avaliarRegistro(v, metas, tolPct);
                  return (
                    <tr key={v.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 tabular-nums">{dmy(v.data)}</td>
                      <td className="py-2 pr-3 font-medium">
                        {nome(v.lojaId)}
                        {v.origem === "exemplo" ? <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">EXEMPLO</span> : null}
                      </td>
                      <td className="py-2 pr-3">{v.periodo === "semanal" ? "Semanal" : "Diário"}</td>
                      <td className="py-2 pr-3">{v.responsavel ?? "—"}</td>
                      {av.metas.map((m) => (
                        <td key={m.k} className="py-2 pr-3 text-right">
                          {m.valor == null ? <span className="text-muted-foreground">—</span> : <StatusPill status={m.status}>{formatarValor(m.formato, m.valor)}</StatusPill>}
                        </td>
                      ))}
                      <td className="py-2 pr-3 text-right tabular-nums">{av.rotina.aplicaveis > 0 ? `${av.rotina.sim}/${av.rotina.aplicaveis}` : "—"}</td>
                      {editavel ? (
                        <td className="py-1 text-right whitespace-nowrap">
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Editar o checklist de ${nome(v.lojaId)} de ${dmy(v.data)}`} onClick={() => { setMsg(null); setEditando(v); document.getElementById("dl-form")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                            <Pencil aria-hidden />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Excluir o checklist de ${nome(v.lojaId)} de ${dmy(v.data)}`} onClick={() => { setErroExcluir(null); setExcluir(v); }}>
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
      </SectionCard>

      <ConfirmDialog
        open={excluir != null}
        onOpenChange={(o) => !o && setExcluir(null)}
        title="Excluir este checklist?"
        description={excluir ? `${nome(excluir.lojaId)} · ${excluir.periodo === "semanal" ? "semana de" : ""} ${dmy(excluir.data)}. As médias do mês na tela de Metas são recalculadas sem ele. A exclusão fica registrada no histórico de alterações.` : ""}
        confirmLabel="Excluir"
        loading={pendente}
        error={erroExcluir}
        onConfirm={confirmarExclusao}
      />
    </div>
  );
}

/* ============================================================ formulário */

type FormProps = {
  slug: string;
  lojas: LojaRef[];
  registros: RegistroDelivery[];
  metas: MetaRow[];
  tolPct: number;
  hoje: string;
  editando: RegistroDelivery | null;
  rupturasPorSemana: Record<string, number> | null;
  lojaInicial: string | null;
  pendente: boolean;
  iniciar: (fn: () => void) => void;
  aoSalvar: (m: NonNullable<Msg>) => void;
  aoCancelar: () => void;
};

function FormularioDelivery({ slug, lojas, registros, metas, tolPct, hoje, editando, rupturasPorSemana, lojaInicial, pendente, iniciar, aoSalvar, aoCancelar }: FormProps) {
  const [lojaId, setLojaId] = useState(editando?.lojaId ?? (lojaInicial && lojas.some((l) => l.id === lojaInicial) ? lojaInicial : (lojas[0]?.id ?? "")));
  const [data, setData] = useState(editando?.data ?? hoje);
  const [periodo, setPeriodo] = useState<PeriodoDelivery>(editando?.periodo ?? "diario");
  const [responsavel, setResponsavel] = useState(editando?.responsavel ?? "");
  const [indic, setIndic] = useState<Record<CampoMeta, string>>({
    preparo: texto(editando?.preparo),
    cancelamentos: texto(editando?.cancelamentos),
    notaIfood: texto(editando?.notaIfood),
    tempoOnline: texto(editando?.tempoOnline),
    rupturas: texto(editando?.rupturas),
  });
  const [acomp, setAcomp] = useState<Record<CampoAcomp, string>>({
    pedidos: texto(editando?.pedidos),
    ticketMedio: texto(editando?.ticketMedio),
    conversao: texto(editando?.conversao),
    atrasos: texto(editando?.atrasos),
    comissoes: texto(editando?.comissoes),
    freteSubsidiado: texto(editando?.freteSubsidiado),
    promocoes: texto(editando?.promocoes),
    custoPedido: texto(editando?.custoPedido),
  });
  const [rotina, setRotina] = useState<Record<number, RespostaRotina | null>>({ ...(editando?.rotina ?? {}) });
  const [obs, setObs] = useState(editando?.observacoes ?? "");

  const dia = dataDoRegistro(periodo, data);
  const valor = (s: string): number | null => (s.trim() === "" ? null : lerNumero(s));
  const previa = avaliarRegistro(
    {
      lojaId,
      data: dia,
      periodo,
      preparo: valor(indic.preparo),
      cancelamentos: valor(indic.cancelamentos),
      notaIfood: valor(indic.notaIfood),
      tempoOnline: valor(indic.tempoOnline),
      rupturas: valor(indic.rupturas),
      rotina: Object.fromEntries(Object.entries(rotina).filter(([, v]) => v != null)) as Record<number, RespostaRotina>,
    },
    metas,
    tolPct,
  );
  const resumoRotina = resumirRotina(rotina);
  const jaExiste = registros.find((r) => r.lojaId === lojaId && r.data === dia && r.periodo === periodo && r.id !== editando?.id) ?? null;
  const rupturasNaSemana = rupturasPorSemana ? (rupturasPorSemana[`${lojaId}|${segundaDaSemana(data)}`] ?? 0) : null;

  const limpar = () => {
    setIndic({ preparo: "", cancelamentos: "", notaIfood: "", tempoOnline: "", rupturas: "" });
    setAcomp({ pedidos: "", ticketMedio: "", conversao: "", atrasos: "", comissoes: "", freteSubsidiado: "", promocoes: "", custoPedido: "" });
    setRotina({});
    setObs("");
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const num = (s: string, rotulo: string): number | null => {
      if (s.trim() === "") return null;
      const v = lerNumero(s);
      if (v == null) throw new Error(`${rotulo}: use apenas dígitos, vírgula ou ponto.`);
      return v;
    };
    try {
      const entrada = {
        lojaId,
        data,
        periodo,
        responsavel: responsavel.trim() || null,
        preparo: num(indic.preparo, "Tempo médio de preparo"),
        cancelamentos: num(indic.cancelamentos, "Cancelamentos"),
        notaIfood: num(indic.notaIfood, "Nota iFood"),
        tempoOnline: num(indic.tempoOnline, "Tempo online"),
        rupturas: num(indic.rupturas, "Rupturas na semana"),
        pedidos: num(acomp.pedidos, "Pedidos"),
        ticketMedio: num(acomp.ticketMedio, "Ticket médio"),
        conversao: num(acomp.conversao, "Conversão"),
        atrasos: num(acomp.atrasos, "Atrasos"),
        comissoes: num(acomp.comissoes, "Comissões e taxas"),
        freteSubsidiado: num(acomp.freteSubsidiado, "Frete subsidiado"),
        promocoes: num(acomp.promocoes, "Promoções e descontos"),
        custoPedido: num(acomp.custoPedido, "Custo de delivery por pedido"),
        rotina: Object.fromEntries(Object.entries(rotina).filter(([, v]) => v != null)) as Record<string, RespostaRotina>,
        observacoes: obs.trim() || null,
      };
      if (!METAS_DELIVERY.some((m) => entrada[m.campo] != null)) {
        aoSalvar({ tipo: "error", texto: "Preencha pelo menos um indicador com meta antes de salvar." });
        return;
      }
      iniciar(async () => {
        const r = await salvarDeliveryAction(slug, entrada, editando?.id ?? null);
        if (r.success) {
          if (!editando) limpar();
          aoSalvar({ tipo: "success", texto: editando ? "Checklist atualizado." : jaExiste ? "Checklist corrigido (já existia um desta loja neste período)." : "Checklist de delivery salvo." });
        } else aoSalvar({ tipo: "error", texto: r.error });
      });
    } catch (erro) {
      aoSalvar({ tipo: "error", texto: erro instanceof Error ? erro.message : "Confira os números." });
    }
  };

  return (
    <form id="dl-form" onSubmit={salvar} className="space-y-4">
      <SectionCard title={editando ? "Editar checklist de indicadores de delivery" : "Checklist de indicadores de delivery"} description="Diário ou semanal, por loja. Se a loja já tem checklist no mesmo dia (ou semana), ele é corrigido — nunca duplica.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="dl-loja">Loja</Label>
            <NativeSelect id="dl-loja" value={lojaId} onChange={(e) => setLojaId(e.target.value)} required>
              {lojas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="dl-data">{periodo === "semanal" ? "Data (qualquer dia da semana)" : "Data"}</Label>
            <Input id="dl-data" type="date" max={hoje} value={data} onChange={(e) => setData(e.target.value)} required />
            {periodo === "semanal" ? <p className="text-[11px] text-muted-foreground">Fica na semana de {dmy(segundaDaSemana(data))} a {dmy(somarDias(segundaDaSemana(data), 6))}.</p> : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="dl-periodo">Período</Label>
            <NativeSelect id="dl-periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value as PeriodoDelivery)}>
              <option value="diario">Diário</option>
              <option value="semanal">Semanal</option>
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="dl-resp">Responsável</Label>
            <Input id="dl-resp" maxLength={120} placeholder="Supervisor de delivery" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </div>
        </div>
        {jaExiste ? (
          <div className="mt-3">
            <FeedbackMessage variant="info">
              {editando ? "Já existe outro checklist desta loja neste dia/semana: ao salvar, o sistema vai recusar para não duplicar." : `Esta loja já tem checklist ${periodo === "semanal" ? "nesta semana" : "neste dia"}: ao salvar, ele será corrigido com os valores abaixo.`}
            </FeedbackMessage>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Indicadores com meta"
        description={previa.preenchidos > 0 ? `${previa.naMeta} de ${previa.preenchidos} preenchidos na meta` : "Preencha os valores para ver o status."}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {METAS_DELIVERY.map((def) => {
            const av = previa.metas.find((m) => m.k === def.k);
            const { meta, direcao } = metaDoDelivery(def, metas, lojaId, dia);
            const mostrarUsar = def.k === "rupturas" && periodo === "semanal" && rupturasNaSemana != null;
            return (
              <div key={def.k} className="space-y-1 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`dl-${def.k}`}>{def.nome}</Label>
                  <StatusPill status={av?.status ?? "neu"}>{ROTULO_STATUS[av?.status ?? "neu"]}</StatusPill>
                </div>
                <Input id={`dl-${def.k}`} inputMode="decimal" placeholder={def.unidade || "valor"} value={indic[def.campo]} onChange={(e) => setIndic((s) => ({ ...s, [def.campo]: e.target.value }))} />
                <p className="text-[11px] text-muted-foreground">{textoMetaDelivery(def, meta, direcao)}</p>
                {mostrarUsar ? (
                  <p className="text-[11px] text-muted-foreground">
                    Registradas na cozinha central nesta semana: <strong>{rupturasNaSemana}</strong>
                    {indic.rupturas !== String(rupturasNaSemana) ? (
                      <>
                        {" "}
                        <button type="button" className="underline underline-offset-2" onClick={() => setIndic((s) => ({ ...s, rupturas: String(rupturasNaSemana) }))}>
                          usar
                        </button>
                      </>
                    ) : null}
                  </p>
                ) : null}
                {def.k === "rupturas" && periodo === "diario" ? <p className="text-[11px] text-muted-foreground">A meta é semanal: o valor de um dia não é comparado.</p> : null}
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Acompanhamento comercial e financeiro" description="Sem meta: servem para acompanhar a tendência.">
          <div className="grid grid-cols-2 gap-3">
            {ACOMPANHAMENTOS_DELIVERY.map((a) => (
              <div key={a.k} className="space-y-1">
                <Label htmlFor={`dl-${a.k}`}>
                  {a.nome}
                  {a.unidade ? <span className="ml-1 text-muted-foreground">({a.unidade})</span> : null}
                </Label>
                <Input id={`dl-${a.k}`} inputMode="decimal" placeholder="acompanhamento" value={acomp[a.campo]} onChange={(e) => setAcomp((s) => ({ ...s, [a.campo]: e.target.value }))} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Rotina de delivery" description={resumoRotina.aplicaveis > 0 ? `${resumoRotina.sim} de ${resumoRotina.aplicaveis} itens ok` : "Responda Sim, Não ou N/A (clique de novo para limpar)."}>
          <ul className="space-y-2">
            {ROTINA_DELIVERY.map((t, i) => (
              <li key={t} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0">
                <span className="min-w-0 flex-1 text-sm">{t}</span>
                <div role="group" aria-label={t} className="inline-flex overflow-hidden rounded-lg border border-border">
                  {RESPOSTAS.map((r) => {
                    const on = rotina[i] === r.v;
                    return (
                      <button
                        key={r.v}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setRotina((s) => ({ ...s, [i]: s[i] === r.v ? null : r.v }))}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${on ? (r.v === "nao" ? "bg-red-500/15 text-red-700 dark:text-red-400" : r.v === "sim" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-foreground") : "text-muted-foreground hover:bg-muted"}`}
                      >
                        {r.rotulo}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {previa.desvios.length > 0 ? (
        <SectionCard title="Desvios encontrados" description="Indicadores fora da meta e itens da rotina marcados como Não. Registre nas observações o que foi combinado, com responsável e prazo.">
          <ul className="space-y-1.5 text-sm">
            {previa.desvios.map((d) => (
              <li key={`${d.tipo}-${d.titulo}`} className="flex flex-wrap items-center gap-2">
                <StatusPill status={d.status}>{d.tipo === "indicador" ? "Indicador" : "Rotina"}</StatusPill>
                <span className="font-medium">{d.titulo}</span>
                <span className="text-muted-foreground">{d.detalhe}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <SectionCard title="Observações e ações">
        <div className="space-y-1">
          <Label htmlFor="dl-obs">Observações e ações</Label>
          <Textarea id="dl-obs" rows={3} maxLength={1000} placeholder="Desvios encontrados, ações combinadas, responsáveis e prazos" value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <Button type="button" variant="outline" onClick={limpar} disabled={pendente}>
            Limpar
          </Button>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden /> Imprimir
          </Button>
          {editando ? (
            <Button type="button" variant="outline" onClick={aoCancelar} disabled={pendente}>
              Cancelar edição
            </Button>
          ) : null}
          <Button type="submit" disabled={pendente || lojas.length === 0}>
            {pendente ? "Salvando…" : editando ? "Salvar alterações" : "Salvar checklist"}
          </Button>
        </div>
      </SectionCard>
    </form>
  );
}
