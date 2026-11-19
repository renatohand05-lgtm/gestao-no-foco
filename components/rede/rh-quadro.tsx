"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Pencil, RotateCcw, Trash2, UserMinus } from "lucide-react";

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
import {
  desligarColaboradorAction,
  excluirColaboradorAction,
  importarColaboradoresAction,
  reativarColaboradorAction,
  salvarColaboradorAction,
  salvarPrevistoAction,
} from "@/lib/rede/actions-rh";
import {
  CARGOS_RH,
  LIMITE_IMPORTACAO_RH,
  lerImportacaoColaboradores,
  linhasCsvQuadro,
  mesesDeCasa,
  montarQuadro,
  rotuloCargo,
  statusQuadro,
  tempoDeCasaPorCargo,
  textoTempoDeCasa,
} from "@/lib/rede/rh";
import type { CargoRh, ColaboradorRh, PrevistoRh } from "@/lib/rede/tipos";

type Msg = { tipo: "success" | "error"; texto: string } | null;
type LojaRef = { id: string; nome: string };

const dmy = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const LINHAS_NA_LISTA = 300;

type Props = {
  slug: string;
  hoje: string;
  /** Lojas mostradas (o filtro da tela). Os formulários também usam só estas. */
  lojas: LojaRef[];
  colaboradores: ColaboradorRh[];
  previstos: PrevistoRh[];
  editavel: boolean;
};

export function RhQuadro({ slug, hoje, lojas, colaboradores, previstos, editavel }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [editando, setEditando] = useState<ColaboradorRh | null>(null);
  const [desligando, setDesligando] = useState<ColaboradorRh | null>(null);
  const [dataDeslig, setDataDeslig] = useState(hoje);
  const [motivoDeslig, setMotivoDeslig] = useState("");
  const [excluir, setExcluir] = useState<ColaboradorRh | null>(null);
  const [erroDialogo, setErroDialogo] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"ativos" | "desligados" | "todos">("ativos");
  const [busca, setBusca] = useState("");

  const nomeLoja = useMemo(() => new Map(lojas.map((l) => [l.id, l.nome] as const)), [lojas]);
  const nome = (id: string) => nomeLoja.get(id) ?? "Loja";
  const ids = useMemo(() => lojas.map((l) => l.id), [lojas]);
  const quadro = useMemo(() => montarQuadro(colaboradores, previstos, ids), [colaboradores, previstos, ids]);
  const ativos = useMemo(() => colaboradores.filter((c) => c.status === "ativo"), [colaboradores]);
  const casa = useMemo(() => tempoDeCasaPorCargo(ativos, hoje), [ativos, hoje]);

  const lista = useMemo(() => {
    const q = busca.trim().toLocaleLowerCase("pt-BR");
    return colaboradores
      .filter((c) => (filtro === "todos" ? true : filtro === "ativos" ? c.status === "ativo" : c.status === "desligado"))
      .filter((c) => (q ? c.nome.toLocaleLowerCase("pt-BR").includes(q) : true))
      .sort((a, b) => nome(a.lojaId).localeCompare(nome(b.lojaId), "pt-BR") || CARGOS_RH.findIndex((x) => x.k === a.cargo) - CARGOS_RH.findIndex((x) => x.k === b.cargo) || a.nome.localeCompare(b.nome, "pt-BR"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colaboradores, filtro, busca, nomeLoja]);
  const visiveis = lista.slice(0, LINHAS_NA_LISTA);

  const concluir = (texto: string) => {
    setMsg({ tipo: "success", texto });
    router.refresh();
  };

  const confirmarDesligamento = () => {
    if (!desligando) return;
    setErroDialogo(null);
    iniciar(async () => {
      const r = await desligarColaboradorAction(slug, desligando.id, { data: dataDeslig, motivo: motivoDeslig.trim() || null });
      if (r.success) {
        setDesligando(null);
        if (editando?.id === desligando.id) setEditando(null);
        concluir(`${desligando.nome} foi desligado(a). O histórico e as ocorrências ficam guardados.`);
      } else setErroDialogo(r.error);
    });
  };

  const confirmarExclusao = () => {
    if (!excluir) return;
    setErroDialogo(null);
    iniciar(async () => {
      const r = await excluirColaboradorAction(slug, excluir.id);
      if (r.success) {
        setExcluir(null);
        if (editando?.id === excluir.id) setEditando(null);
        concluir("Cadastro excluído.");
      } else setErroDialogo(r.error);
    });
  };

  const reativar = (c: ColaboradorRh) => {
    setMsg(null);
    iniciar(async () => {
      const r = await reativarColaboradorAction(slug, c.id);
      if (r.success) concluir(`${c.nome} voltou para o quadro ativo.`);
      else setMsg({ tipo: "error", texto: r.error });
    });
  };

  return (
    <div className="space-y-5">
      {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}

      <SectionCard title="Quadro de pessoal" description="Ativos / previstos por cargo. Verde com o quadro completo, amarelo a partir de 80% do previsto, vermelho abaixo disso. Os ativos vêm do cadastro abaixo.">
        {lojas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma loja disponível.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Cargo</th>
                  {quadro.lojas.map((l) => (
                    <th key={l.lojaId} className="py-2 pr-3 text-right font-medium">
                      {nome(l.lojaId)}
                    </th>
                  ))}
                  <th className="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {CARGOS_RH.map((c) => (
                  <tr key={c.k} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-medium">{c.nome}</td>
                    {quadro.lojas.map((l) => (
                      <td key={l.lojaId} className="py-2 pr-3 text-right">
                        <StatusPill status={statusQuadro(l.porCargo[c.k].ativo, l.porCargo[c.k].previsto)} className="min-w-12 justify-center">
                          {l.porCargo[c.k].ativo}/{l.porCargo[c.k].previsto}
                        </StatusPill>
                      </td>
                    ))}
                    <td className="py-2 text-right font-semibold tabular-nums">
                      {quadro.total.porCargo[c.k].ativo}/{quadro.total.porCargo[c.k].previsto}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className="py-2 pr-3 font-semibold">Total</td>
                  {quadro.lojas.map((l) => (
                    <td key={l.lojaId} className="py-2 pr-3 text-right font-semibold tabular-nums">
                      {l.ativo}/{l.previsto}
                    </td>
                  ))}
                  <td className="py-2 text-right font-semibold tabular-nums">
                    {quadro.total.ativo}/{quadro.total.previsto}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {quadro.excedente > 0 ? <p className="mt-3 text-xs text-muted-foreground">{nf0.format(quadro.excedente)} {quadro.excedente === 1 ? "pessoa acima" : "pessoas acima"} do previsto em algum cargo (não compensa vaga de outro cargo).</p> : null}
      </SectionCard>

      <SectionCard title="Tempo de casa por cargo" description="Meses completos desde a admissão, só de quem está ativo.">
        {casa.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum colaborador ativo cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Cargo</th>
                  <th className="py-2 pr-3 text-right font-medium">Pessoas</th>
                  <th className="py-2 pr-3 text-right font-medium">Tempo médio de casa</th>
                  <th className="py-2 pr-3 text-right font-medium">Até 6 meses</th>
                  <th className="py-2 pr-3 text-right font-medium">6 a 12 meses</th>
                  <th className="py-2 text-right font-medium">Mais de 1 ano</th>
                </tr>
              </thead>
              <tbody>
                {casa.map((g) => (
                  <tr key={g.cargo} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-medium">{rotuloCargo(g.cargo)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{g.pessoas}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{textoTempoDeCasa(Math.round(g.mediaMeses))}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{g.ate6}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{g.de6a12}</td>
                    <td className="py-2 text-right tabular-nums">{g.mais12}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {editavel ? (
        <>
          <SectionCard title="Quadro previsto" description="Quantas pessoas cada loja deve ter em cada cargo. É a referência do quadro acima; os ativos nunca são digitados aqui.">
            <FormularioPrevisto key={`${lojas.map((l) => l.id).join(",")}|${previstos.map((p) => `${p.lojaId}:${p.cargo}:${p.previsto}`).join(",")}`} slug={slug} lojas={lojas} previstos={previstos} pendente={pendente} iniciar={iniciar} aoSalvar={(m) => { setMsg(m); if (m.tipo === "success") router.refresh(); }} />
          </SectionCard>

          <SectionCard
            title={editando ? `Editar ${editando.nome}` : "Cadastrar colaborador"}
            description="Guarda só nome, cargo, loja e datas. Não registre CPF, salário nem dados de saúde."
          >
            <FormularioColaborador
              key={editando?.id ?? "novo"}
              slug={slug}
              lojas={lojas}
              hoje={hoje}
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

          <SectionCard title="Importar lista" description={`Cole uma pessoa por linha: Nome ; Cargo ; Admissão (dd/mm/aaaa). Pode colar direto do Excel. Até ${LIMITE_IMPORTACAO_RH} linhas, para uma loja por vez. Se uma linha tiver erro, nada é gravado.`}>
            <FormularioImportacao slug={slug} lojas={lojas} hoje={hoje} colaboradores={colaboradores} pendente={pendente} iniciar={iniciar} aoConcluir={(m) => { setMsg(m); if (m.tipo === "success") router.refresh(); }} />
          </SectionCard>
        </>
      ) : (
        <FeedbackMessage variant="info">Seu perfil pode consultar o quadro de pessoal, mas não alterar.</FeedbackMessage>
      )}

      <SectionCard title="Colaboradores" description={lista.length > visiveis.length ? `Mostrando ${visiveis.length} de ${lista.length}. A exportação leva todos.` : `${lista.length} ${lista.length === 1 ? "pessoa" : "pessoas"}.`}>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="rh-filtro">Situação</Label>
              <NativeSelect id="rh-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>
                <option value="ativos">Ativos</option>
                <option value="desligados">Desligados</option>
                <option value="todos">Todos</option>
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rh-busca">Buscar pelo nome</Label>
              <Input id="rh-busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome" />
            </div>
          </div>
          <AcoesExportar arquivo="colaboradores-fat-buddha.csv" linhas={linhasCsvQuadro(colaboradores, nome, hoje)} />
        </div>
        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">{colaboradores.length === 0 ? "Nenhum colaborador cadastrado ainda." : "Nenhum colaborador para este filtro."}</p>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Nome</th>
                  <th className="py-2 pr-3 font-medium">Cargo</th>
                  <th className="py-2 pr-3 font-medium">Loja</th>
                  <th className="py-2 pr-3 font-medium">Admissão</th>
                  <th className="py-2 pr-3 font-medium">Tempo de casa</th>
                  <th className="py-2 pr-3 font-medium">Situação</th>
                  {editavel ? <th className="py-2 text-right font-medium">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {visiveis.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 align-top last:border-0">
                    <td className="py-2 pr-3 font-medium">
                      {c.nome}
                      {c.origem === "exemplo" ? <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">EXEMPLO</span> : null}
                    </td>
                    <td className="py-2 pr-3">{rotuloCargo(c.cargo)}</td>
                    <td className="py-2 pr-3">{nome(c.lojaId)}</td>
                    <td className="py-2 pr-3 tabular-nums">{dmy(c.dataAdmissao)}</td>
                    <td className="py-2 pr-3 tabular-nums">{c.status === "ativo" ? textoTempoDeCasa(mesesDeCasa(c.dataAdmissao, hoje)) : "—"}</td>
                    <td className="py-2 pr-3 whitespace-normal">
                      {c.status === "ativo" ? (
                        <StatusPill status="ok">Ativo</StatusPill>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Desligado em {dmy(c.dataDesligamento)}
                          {c.motivoDesligamento ? ` · ${c.motivoDesligamento}` : ""}
                        </span>
                      )}
                    </td>
                    {editavel ? (
                      <td className="py-1 text-right whitespace-nowrap">
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Editar ${c.nome}`} onClick={() => { setMsg(null); setEditando(c); document.getElementById("rhc-nome")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
                          <Pencil aria-hidden />
                        </Button>
                        {c.status === "ativo" ? (
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Desligar ${c.nome}`} onClick={() => { setErroDialogo(null); setDataDeslig(hoje); setMotivoDeslig(""); setDesligando(c); }}>
                            <UserMinus aria-hidden />
                          </Button>
                        ) : (
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Reativar ${c.nome}`} disabled={pendente} onClick={() => reativar(c)}>
                            <RotateCcw aria-hidden />
                          </Button>
                        )}
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Excluir o cadastro de ${c.nome}`} onClick={() => { setErroDialogo(null); setExcluir(c); }}>
                          <Trash2 aria-hidden />
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={desligando != null}
        onOpenChange={(o) => !o && setDesligando(null)}
        title={desligando ? `Desligar ${desligando.nome}?` : "Desligar"}
        description={
          <div className="space-y-3">
            <p>A pessoa sai do quadro ativo. O cadastro e as ocorrências continuam guardados. Se foi engano, dá para reativar depois.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="rhd-data">Data do desligamento</Label>
                <Input id="rhd-data" type="date" max={hoje} min={desligando?.dataAdmissao} value={dataDeslig} onChange={(e) => setDataDeslig(e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="rhd-motivo">Motivo (opcional)</Label>
                <Input id="rhd-motivo" maxLength={300} value={motivoDeslig} onChange={(e) => setMotivoDeslig(e.target.value)} placeholder="Ex.: pedido de demissão" />
              </div>
            </div>
          </div>
        }
        confirmLabel="Desligar"
        loading={pendente}
        error={erroDialogo}
        onConfirm={confirmarDesligamento}
        wide
      />

      <ConfirmDialog
        open={excluir != null}
        onOpenChange={(o) => !o && setExcluir(null)}
        title="Excluir este cadastro?"
        description={excluir ? `${excluir.nome} · ${rotuloCargo(excluir.cargo)} · ${nome(excluir.lojaId)}. Use isto só para cadastro feito por engano; para quem saiu da empresa, use "Desligar". Quem tem ocorrências registradas não pode ser excluído.` : ""}
        confirmLabel="Excluir"
        loading={pendente}
        error={erroDialogo}
        onConfirm={confirmarExclusao}
      />
    </div>
  );
}

/* ============================================================ quadro previsto */

type FormBase = { slug: string; lojas: LojaRef[]; pendente: boolean; iniciar: (fn: () => void) => void; aoSalvar: (m: NonNullable<Msg>) => void };

function FormularioPrevisto({ slug, lojas, previstos, pendente, iniciar, aoSalvar }: FormBase & { previstos: PrevistoRh[] }) {
  const [lojaId, setLojaId] = useState(lojas[0]?.id ?? "");
  const atuais = (id: string): Record<CargoRh, string> => {
    const o = {} as Record<CargoRh, string>;
    for (const c of CARGOS_RH) o[c.k] = String(previstos.find((p) => p.lojaId === id && p.cargo === c.k)?.previsto ?? 0);
    return o;
  };
  const [valores, setValores] = useState<Record<CargoRh, string>>(() => atuais(lojas[0]?.id ?? ""));

  const trocarLoja = (id: string) => {
    setLojaId(id);
    setValores(atuais(id));
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const previstosNum = {} as Record<CargoRh, number>;
    for (const c of CARGOS_RH) {
      const t = valores[c.k].trim();
      const n = t === "" ? 0 : Number(t);
      if (!Number.isInteger(n) || n < 0 || n > 99) {
        aoSalvar({ tipo: "error", texto: `Confira o campo "${c.nome}": use um número inteiro de 0 a 99.` });
        return;
      }
      previstosNum[c.k] = n;
    }
    iniciar(async () => {
      const r = await salvarPrevistoAction(slug, { lojaId, previstos: previstosNum });
      aoSalvar(r.success ? { tipo: "success", texto: "Quadro previsto salvo." } : { tipo: "error", texto: r.error });
    });
  };

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-1">
          <Label htmlFor="rhp-loja">Loja</Label>
          <NativeSelect id="rhp-loja" value={lojaId} onChange={(e) => trocarLoja(e.target.value)}>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        {CARGOS_RH.map((c) => (
          <div key={c.k} className="space-y-1">
            <Label htmlFor={`rhp-${c.k}`}>{c.nome}</Label>
            <Input id={`rhp-${c.k}`} type="number" inputMode="numeric" min={0} max={99} step={1} value={valores[c.k]} onChange={(e) => setValores((v) => ({ ...v, [c.k]: e.target.value }))} />
          </div>
        ))}
      </div>
      <Button type="submit" disabled={pendente || lojas.length === 0}>
        {pendente ? "Salvando…" : "Salvar quadro previsto"}
      </Button>
    </form>
  );
}

/* ============================================================ cadastro */

function FormularioColaborador({ slug, lojas, hoje, editando, pendente, iniciar, aoSalvar, aoCancelar }: FormBase & { hoje: string; editando: ColaboradorRh | null; aoCancelar: () => void }) {
  const [lojaId, setLojaId] = useState(editando?.lojaId && lojas.some((l) => l.id === editando.lojaId) ? editando.lojaId : (lojas[0]?.id ?? ""));
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [cargo, setCargo] = useState<CargoRh>(editando?.cargo ?? "atendente");
  const [admissao, setAdmissao] = useState(editando?.dataAdmissao ?? hoje);
  const [obs, setObs] = useState(editando?.observacoes ?? "");

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    iniciar(async () => {
      const r = await salvarColaboradorAction(slug, { lojaId, nome, cargo, dataAdmissao: admissao, observacoes: obs.trim() || null }, editando?.id ?? null);
      if (r.success) {
        if (!editando) {
          setNome("");
          setObs("");
        }
        aoSalvar({ tipo: "success", texto: editando ? "Cadastro atualizado." : "Colaborador cadastrado." });
      } else aoSalvar({ tipo: "error", texto: r.error });
    });
  };

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="rhc-nome">Nome</Label>
          <Input id="rhc-nome" maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome e inicial do sobrenome" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rhc-loja">Loja</Label>
          <NativeSelect id="rhc-loja" value={lojaId} onChange={(e) => setLojaId(e.target.value)} required>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rhc-cargo">Cargo</Label>
          <NativeSelect id="rhc-cargo" value={cargo} onChange={(e) => setCargo(e.target.value as CargoRh)}>
            {CARGOS_RH.map((c) => (
              <option key={c.k} value={c.k}>
                {c.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rhc-adm">Data de admissão</Label>
          <Input id="rhc-adm" type="date" max={hoje} min="1990-01-01" value={admissao} onChange={(e) => setAdmissao(e.target.value)} required />
        </div>
        <div className="space-y-1 sm:col-span-2 lg:col-span-3">
          <Label htmlFor="rhc-obs">Observação (opcional)</Label>
          <Input id="rhc-obs" maxLength={500} value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pendente || lojas.length === 0}>
          {pendente ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar"}
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

/* ============================================================ importação */

function FormularioImportacao({ slug, lojas, hoje, colaboradores, pendente, iniciar, aoConcluir }: Omit<FormBase, "aoSalvar"> & { hoje: string; colaboradores: ColaboradorRh[]; aoConcluir: (m: NonNullable<Msg>) => void }) {
  const [lojaId, setLojaId] = useState(lojas[0]?.id ?? "");
  const [texto, setTexto] = useState("");

  const previa = useMemo(() => {
    if (texto.trim() === "") return null;
    const nomes = colaboradores.filter((c) => c.lojaId === lojaId && c.status === "ativo").map((c) => c.nome);
    return lerImportacaoColaboradores(texto, hoje, nomes);
  }, [texto, lojaId, colaboradores, hoje]);

  const importar = () => {
    iniciar(async () => {
      const r = await importarColaboradoresAction(slug, { lojaId, texto });
      if (r.success) {
        setTexto("");
        aoConcluir({ tipo: "success", texto: `${r.importados} ${r.importados === 1 ? "colaborador importado" : "colaboradores importados"}.` });
      } else aoConcluir({ tipo: "error", texto: r.error });
    });
  };

  return (
    <div className="space-y-3">
      <div className="max-w-xs space-y-1">
        <Label htmlFor="rhi-loja">Loja</Label>
        <NativeSelect id="rhi-loja" value={lojaId} onChange={(e) => setLojaId(e.target.value)}>
          {lojas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nome}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1">
        <Label htmlFor="rhi-texto">Lista</Label>
        <Textarea id="rhi-texto" rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={"Maria Souza;Atendente;12/03/2026\nJoão Lima;Auxiliar de cozinha;02/05/2025"} spellCheck={false} />
      </div>
      {previa ? (
        previa.erros.length > 0 ? (
          <FeedbackMessage variant="error">
            <span className="block font-medium">Nada será importado enquanto houver erro:</span>
            {previa.erros.slice(0, 8).map((e) => (
              <span key={`${e.linha}-${e.mensagem}`} className="mt-0.5 block">
                Linha {e.linha}: {e.mensagem}
              </span>
            ))}
            {previa.erros.length > 8 ? <span className="mt-0.5 block">… e mais {previa.erros.length - 8}.</span> : null}
          </FeedbackMessage>
        ) : (
          <FeedbackMessage variant="info">
            {previa.linhas.length} {previa.linhas.length === 1 ? "pessoa pronta" : "pessoas prontas"} para importar em {lojas.find((l) => l.id === lojaId)?.nome ?? "a loja"}.
          </FeedbackMessage>
        )
      ) : null}
      <Button type="button" onClick={importar} disabled={pendente || !previa || previa.erros.length > 0 || previa.linhas.length === 0}>
        {pendente ? "Importando…" : previa && previa.linhas.length > 0 ? `Importar ${previa.linhas.length}` : "Importar"}
      </Button>
    </div>
  );
}
