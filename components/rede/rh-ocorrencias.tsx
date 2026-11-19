"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { StatusPill } from "@/components/rede/status";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SectionCard } from "@/components/ui/section-card";
import { atualizarOcorrenciaAction, excluirOcorrenciaAction, registrarOcorrenciaAction } from "@/lib/rede/actions-rh";
import {
  alertasDePessoas,
  JANELA_OCORRENCIAS_MESES,
  linhasCsvOcorrencias,
  ocorrenciasRecentes,
  resumoPorLojaTipo,
  rotuloCargo,
  rotuloStatusOcorrencia,
  rotuloTipo,
  STATUS_OCORRENCIA,
  TIPOS_OCORRENCIA,
  tomDoTipo,
} from "@/lib/rede/rh";
import type { ColaboradorRh, OcorrenciaRh, StatusOcorrencia, TipoOcorrencia } from "@/lib/rede/tipos";

type Msg = { tipo: "success" | "error"; texto: string } | null;
type LojaRef = { id: string; nome: string };

const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const LINHAS_NO_HISTORICO = 300;

type Props = {
  slug: string;
  hoje: string;
  lojas: LojaRef[];
  /** Cadastro (para nomes e alertas); null quando o perfil não vê o quadro de pessoal. */
  colaboradores: ColaboradorRh[] | null;
  /** Mais recentes primeiro. */
  ocorrencias: OcorrenciaRh[];
  editavel: boolean;
};

export function RhOcorrencias({ slug, hoje, lojas, colaboradores, ocorrencias, editavel }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [editando, setEditando] = useState<OcorrenciaRh | null>(null);
  const [excluir, setExcluir] = useState<OcorrenciaRh | null>(null);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | TipoOcorrencia>("todos");

  const nomeLoja = useMemo(() => new Map(lojas.map((l) => [l.id, l.nome] as const)), [lojas]);
  const nome = (id: string) => nomeLoja.get(id) ?? "Loja";
  const ids = useMemo(() => lojas.map((l) => l.id), [lojas]);
  const pessoas = useMemo(() => new Map((colaboradores ?? []).map((c) => [c.id, c] as const)), [colaboradores]);
  const nomePessoa = (id: string) => pessoas.get(id)?.nome ?? "Colaborador";

  const recentes = useMemo(() => ocorrenciasRecentes(ocorrencias, hoje), [ocorrencias, hoje]);
  const alertas = useMemo(() => alertasDePessoas(recentes, colaboradores ?? []), [recentes, colaboradores]);
  const resumo = useMemo(() => resumoPorLojaTipo(ocorrencias, ids), [ocorrencias, ids]);
  const lista = useMemo(() => ocorrencias.filter((o) => filtro === "todos" || o.tipo === filtro), [ocorrencias, filtro]);
  const visiveis = lista.slice(0, LINHAS_NO_HISTORICO);

  const confirmarExclusao = () => {
    if (!excluir) return;
    setErroExcluir(null);
    iniciar(async () => {
      const r = await excluirOcorrenciaAction(slug, excluir.id);
      if (r.success) {
        setExcluir(null);
        if (editando?.id === excluir.id) setEditando(null);
        setMsg({ tipo: "success", texto: "Ocorrência excluída." });
        router.refresh();
      } else setErroExcluir(r.error);
    });
  };

  return (
    <div className="space-y-5">
      {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}

      {editavel ? (
        <SectionCard
          title={editando ? "Editar ocorrência" : "Registrar ocorrência"}
          description="Dados pessoais sensíveis: só quem tem acesso a RH enxerga esta aba. Em atestado médico, registre apenas que houve atestado e o período — nunca diagnóstico ou CID."
        >
          <FormularioOcorrencia
            key={editando?.id ?? "novo"}
            slug={slug}
            lojas={lojas}
            hoje={hoje}
            colaboradores={colaboradores ?? []}
            editando={editando}
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
        </SectionCard>
      ) : (
        <FeedbackMessage variant="info">Seu perfil pode consultar as ocorrências, mas não registrar ou alterar.</FeedbackMessage>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <SectionCard title="Atenção" description={`Últimos ${JANELA_OCORRENCIAS_MESES} meses, só de quem está ativo.`}>
          {colaboradores == null ? (
            <p className="text-sm text-muted-foreground">Seu perfil não vê o cadastro de colaboradores, então os alertas por pessoa não são montados.</p>
          ) : alertas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum colaborador em atenção.</p>
          ) : (
            <ul className="space-y-3">
              {alertas.map((a) => {
                const p = pessoas.get(a.colaboradorId);
                return (
                  <li key={a.colaboradorId} className="flex gap-3 text-sm">
                    <span className={a.nivel === "bad" ? "mt-1.5 size-2 shrink-0 rounded-full bg-red-500" : "mt-1.5 size-2 shrink-0 rounded-full bg-amber-500"} role="img" aria-label={a.nivel === "bad" ? "Crítico" : "Atenção"} />
                    <div>
                      <p className="font-medium">
                        {p?.nome ?? "Colaborador"}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          {p ? `${rotuloCargo(p.cargo)} · ${nome(p.lojaId)}` : ""}
                        </span>
                      </p>
                      <p className="text-muted-foreground">{a.texto}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Ocorrências por loja e tipo" description={`Todo o período carregado (${ocorrencias.length} ${ocorrencias.length === 1 ? "registro" : "registros"}).`}>
          {resumo.tiposUsados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ocorrência registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Loja</th>
                    {resumo.tiposUsados.map((t) => (
                      <th key={t} className="py-2 pr-3 text-right font-medium">
                        {rotuloTipo(t)}
                      </th>
                    ))}
                    <th className="py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.linhas.map((l) => (
                    <tr key={l.lojaId} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 font-medium">{nome(l.lojaId)}</td>
                      {resumo.tiposUsados.map((t) => (
                        <td key={t} className="py-2 pr-3 text-right tabular-nums">
                          {l.porTipo[t] ?? <span className="text-muted-foreground">—</span>}
                        </td>
                      ))}
                      <td className="py-2 text-right font-semibold tabular-nums">{l.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Histórico de ocorrências" description={lista.length > visiveis.length ? `Mostrando as ${visiveis.length} mais recentes de ${lista.length}. A exportação leva todas.` : `${lista.length} ${lista.length === 1 ? "registro" : "registros"}.`}>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <Label htmlFor="oc-filtro">Tipo</Label>
            <NativeSelect id="oc-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>
              <option value="todos">Todos os tipos</option>
              {TIPOS_OCORRENCIA.map((t) => (
                <option key={t.k} value={t.k}>
                  {t.nome}
                </option>
              ))}
            </NativeSelect>
          </div>
          <AcoesExportar arquivo="ocorrencias-rh-fat-buddha.csv" linhas={linhasCsvOcorrencias(ocorrencias, nome, colaboradores ?? [])} imprimir={false} />
        </div>
        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">{ocorrencias.length === 0 ? "Nenhuma ocorrência registrada ainda." : "Nenhuma ocorrência para este filtro."}</p>
        ) : (
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Data</th>
                  <th className="py-2 pr-3 font-medium">Colaborador</th>
                  <th className="py-2 pr-3 font-medium">Loja</th>
                  <th className="py-2 pr-3 font-medium">Tipo</th>
                  <th className="py-2 pr-3 font-medium">Motivo</th>
                  <th className="py-2 pr-3 font-medium">Responsável</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  {editavel ? <th className="py-2 text-right font-medium">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {visiveis.map((o) => {
                  const p = pessoas.get(o.colaboradorId);
                  return (
                    <tr key={o.id} className="border-b border-border/60 align-top last:border-0">
                      <td className="py-2 pr-3 tabular-nums">{dmy(o.data)}</td>
                      <td className="py-2 pr-3">
                        <span className="font-medium">{nomePessoa(o.colaboradorId)}</span>
                        {p ? <div className="text-xs text-muted-foreground">{rotuloCargo(p.cargo)}{p.status === "desligado" ? " · desligado" : ""}</div> : null}
                      </td>
                      <td className="py-2 pr-3">{nome(o.lojaId)}</td>
                      <td className="py-2 pr-3">
                        <StatusPill status={tomDoTipo(o.tipo)}>{rotuloTipo(o.tipo)}</StatusPill>
                        {o.origem === "exemplo" ? <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">EXEMPLO</span> : null}
                      </td>
                      <td className="min-w-56 py-2 pr-3 whitespace-normal">
                        {o.motivo}
                        {o.observacoes ? <div className="text-xs text-muted-foreground">{o.observacoes}</div> : null}
                      </td>
                      <td className="py-2 pr-3">{o.responsavel ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-2 pr-3">{rotuloStatusOcorrencia(o.status)}</td>
                      {editavel ? (
                        <td className="py-1 text-right whitespace-nowrap">
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Editar a ocorrência de ${nomePessoa(o.colaboradorId)} em ${dmy(o.data)}`} onClick={() => { setMsg(null); setEditando(o); document.getElementById("oc-motivo")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
                            <Pencil aria-hidden />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Excluir a ocorrência de ${nomePessoa(o.colaboradorId)} em ${dmy(o.data)}`} onClick={() => { setErroExcluir(null); setExcluir(o); }}>
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
        title="Excluir esta ocorrência?"
        description={excluir ? `${nomePessoa(excluir.colaboradorId)} · ${rotuloTipo(excluir.tipo)} · ${dmy(excluir.data)}. A exclusão fica registrada no histórico de alterações.` : ""}
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
  hoje: string;
  colaboradores: ColaboradorRh[];
  editando: OcorrenciaRh | null;
  pendente: boolean;
  iniciar: (fn: () => void) => void;
  aoSalvar: (m: NonNullable<Msg>) => void;
  aoCancelar: () => void;
};

function FormularioOcorrencia({ slug, lojas, hoje, colaboradores, editando, pendente, iniciar, aoSalvar, aoCancelar }: FormProps) {
  const nomeLoja = useMemo(() => new Map(lojas.map((l) => [l.id, l.nome] as const)), [lojas]);
  // Todos do cadastro nas lojas da tela: os desligados também entram (registrar o desligamento, corrigir um registro antigo).
  const opcoes = useMemo(
    () =>
      colaboradores
        .filter((c) => nomeLoja.has(c.lojaId))
        .sort((a, b) => (nomeLoja.get(a.lojaId) ?? "").localeCompare(nomeLoja.get(b.lojaId) ?? "", "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR")),
    [colaboradores, nomeLoja],
  );
  const [colaboradorId, setColaboradorId] = useState(editando?.colaboradorId ?? opcoes.find((c) => c.status === "ativo")?.id ?? opcoes[0]?.id ?? "");
  const [tipo, setTipo] = useState<TipoOcorrencia>(editando?.tipo ?? "feedback");
  const [data, setData] = useState(editando?.data ?? hoje);
  const [status, setStatus] = useState<StatusOcorrencia>(editando?.status ?? "registrada");
  const [motivo, setMotivo] = useState(editando?.motivo ?? "");
  const [responsavel, setResponsavel] = useState(editando?.responsavel ?? "");
  const [obs, setObs] = useState(editando?.observacoes ?? "");

  const escolhido = opcoes.find((c) => c.id === colaboradorId);

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escolhido) {
      aoSalvar({ tipo: "error", texto: "Escolha o colaborador." });
      return;
    }
    const entrada = { lojaId: escolhido.lojaId, colaboradorId: escolhido.id, tipo, data, status, motivo, responsavel: responsavel.trim() || null, observacoes: obs.trim() || null };
    iniciar(async () => {
      const r = editando ? await atualizarOcorrenciaAction(slug, editando.id, entrada) : await registrarOcorrenciaAction(slug, entrada);
      if (r.success) {
        if (!editando) {
          setMotivo("");
          setObs("");
        }
        aoSalvar({ tipo: "success", texto: editando ? "Ocorrência atualizada." : "Ocorrência registrada." });
      } else aoSalvar({ tipo: "error", texto: r.error });
    });
  };

  if (opcoes.length === 0) return <p className="text-sm text-muted-foreground">Cadastre colaboradores no Quadro de pessoal antes de registrar ocorrências.</p>;

  const lojasComPessoas = lojas.filter((l) => opcoes.some((c) => c.lojaId === l.id));

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="oc-colab">Colaborador</Label>
          <NativeSelect id="oc-colab" value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)} required>
            {lojasComPessoas.map((l) => (
              <optgroup key={l.id} label={l.nome}>
                {opcoes
                  .filter((c) => c.lojaId === l.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} — {rotuloCargo(c.cargo)}
                      {c.status === "desligado" ? " (desligado)" : ""}
                    </option>
                  ))}
              </optgroup>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="oc-tipo">Tipo</Label>
          <NativeSelect id="oc-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoOcorrencia)}>
            {TIPOS_OCORRENCIA.map((t) => (
              <option key={t.k} value={t.k}>
                {t.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="oc-data">Data</Label>
          <Input id="oc-data" type="date" max={hoje} min={escolhido?.dataAdmissao} value={data} onChange={(e) => setData(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="oc-status">Status</Label>
          <NativeSelect id="oc-status" value={status} onChange={(e) => setStatus(e.target.value as StatusOcorrencia)}>
            {STATUS_OCORRENCIA.map((s) => (
              <option key={s.k} value={s.k}>
                {s.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="oc-motivo">Motivo</Label>
          <Input id="oc-motivo" maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: atraso recorrente, descumprimento de padrão de higiene" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="oc-resp">Responsável</Label>
          <Input id="oc-resp" maxLength={120} value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Quem aplicou" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="oc-obs">Observação</Label>
          <Input id="oc-obs" maxLength={1000} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Detalhes, testemunhas, documentos" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : editando ? "Salvar alterações" : "Registrar"}
        </Button>
        {editando ? (
          <Button type="button" variant="outline" onClick={aoCancelar} disabled={pendente}>
            Cancelar edição
          </Button>
        ) : null}
      </div>
    </form>
  );
}
