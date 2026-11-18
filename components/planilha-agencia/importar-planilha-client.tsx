"use client";

/**
 * Importador de planilha (agências, consultórios, clínicas…).
 * Fluxo: escolher a planilha → conferir a prévia (clientes e DRE) → confirmar.
 * O arquivo fica no navegador; a cada ajuste ele é reenviado para refazer a prévia, e só a
 * confirmação grava no portal. Importar de novo a mesma planilha não duplica nada.
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { ImportUploadZone } from "@/components/import-engine/upload-zone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DRE_LINHA_LABELS, type DreLinhaEconomica } from "@/lib/dre/dre-types";
import { formatCurrency } from "@/lib/format";
import type { OpcoesImportacao } from "@/lib/planilha-agencia/tipos";
import type {
  ErroResposta,
  MesPrevio,
  RespostaAnalise,
  RespostaImportacao,
} from "@/lib/planilha-agencia/respostas";
import { cn } from "@/lib/utils";

const ACEITA = ".xlsx,.xlsb,.xls,.csv";
const LIMITE_BYTES = 4 * 1024 * 1024;
const ESPERA_REANALISE_MS = 350;
const LINHAS_CLIENTES_INICIAIS = 12;

type Props = { tenantSlug: string };

type Resposta<T> = T | ErroResposta;

const NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function rotuloMes(mes: string): string {
  return `${NOMES_MES[Number(mes.slice(5, 7)) - 1] ?? mes.slice(5, 7)}/${mes.slice(2, 4)}`;
}

function dataCurta(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

function nomeDaLinha(linha: string | null): string {
  if (!linha) return "Fora do resultado (pendente)";
  return DRE_LINHA_LABELS[linha as DreLinhaEconomica] ?? linha;
}

async function chamar<T>(
  rota: "analisar" | "importar",
  tenantSlug: string,
  arquivo: File,
  opcoes?: Partial<OpcoesImportacao>,
): Promise<Resposta<T>> {
  const form = new FormData();
  form.set("tenantSlug", tenantSlug);
  form.set("file", arquivo);
  if (opcoes) form.set("opcoes", JSON.stringify(opcoes));
  try {
    const r = await fetch(`/api/planilha-agencia/${rota}`, { method: "POST", body: form });
    const corpo = (await r.json().catch(() => null)) as Resposta<T> | null;
    if (corpo && typeof corpo === "object" && "ok" in corpo) return corpo;
    return { ok: false, erro: "O servidor respondeu algo inesperado. Tente de novo." };
  } catch {
    return { ok: false, erro: "Sem conexão com o servidor. Confira sua internet e tente de novo." };
  }
}

export function ImportarPlanilhaClient({ tenantSlug }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analise, setAnalise] = useState<RespostaAnalise | null>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<RespostaImportacao | null>(null);
  const [todosClientes, setTodosClientes] = useState(false);

  // Cada pedido ganha um número; respostas de pedidos antigos são descartadas.
  const numeroDoPedido = useRef(0);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  const analisar = useCallback(
    (f: File, opcoes?: Partial<OpcoesImportacao>, espera = 0) => {
      if (temporizador.current) clearTimeout(temporizador.current);
      const meu = ++numeroDoPedido.current;
      setLendo(true);
      setErro(null);
      temporizador.current = setTimeout(async () => {
        const r = await chamar<RespostaAnalise>("analisar", tenantSlug, f, opcoes);
        if (meu !== numeroDoPedido.current) return;
        setLendo(false);
        if (r.ok) setAnalise(r);
        else setErro(r.erro);
      }, espera);
    },
    [tenantSlug],
  );

  function aoEscolher(f: File) {
    setResultado(null);
    setAnalise(null);
    setTodosClientes(false);
    if (f.size > LIMITE_BYTES) {
      setArquivo(null);
      setErro(
        `A planilha tem ${(f.size / 1024 / 1024).toFixed(1)} MB e o limite é 4 MB. Apague as abas que você não precisa (gráficos e painéis, por exemplo) e envie de novo.`,
      );
      return;
    }
    setArquivo(f);
    analisar(f);
  }

  function recomecar() {
    numeroDoPedido.current++;
    setArquivo(null);
    setAnalise(null);
    setResultado(null);
    setErro(null);
    setLendo(false);
    setTodosClientes(false);
  }

  /** Reenvia a planilha com as escolhas novas (a prévia é refeita no servidor). */
  function pedir(opcoes: Partial<OpcoesImportacao>, espera = ESPERA_REANALISE_MS) {
    if (arquivo) analisar(arquivo, opcoes, espera);
  }

  async function confirmar() {
    if (!arquivo || !analise) return;
    setImportando(true);
    setErro(null);
    const r = await chamar<RespostaImportacao>("importar", tenantSlug, arquivo, analise.opcoes);
    setImportando(false);
    if (r.ok) setResultado(r);
    else setErro(r.erro);
  }

  /* ----------------------------------------------------------------- derivados */

  const opcoes = analise?.opcoes ?? null;
  const mesesAtivos = useMemo(
    () => (analise?.dre.meses ?? []).filter((m) => m.marcado && m.situacao !== "ocupado"),
    [analise],
  );
  const lancamentosAGravar = useMemo(
    () =>
      mesesAtivos.reduce(
        (s, m) => ({ criar: s.criar + m.criar, atualizar: s.atualizar + m.atualizar }),
        { criar: 0, atualizar: 0 },
      ),
    [mesesAtivos],
  );
  const nada =
    !analise ||
    (analise.clientes.resumo.novos + analise.clientes.resumo.atualizar === 0 &&
      lancamentosAGravar.criar + lancamentosAGravar.atualizar === 0);

  /* ----------------------------------------------------------------- telas */

  if (resultado) {
    return <TelaResultado resultado={resultado} tenantSlug={tenantSlug} onNova={recomecar} />;
  }

  if (!arquivo || (!analise && !erro)) {
    return (
      <div className="space-y-4">
        <ImportUploadZone
          onFile={aoEscolher}
          accept={ACEITA}
          disabled={lendo}
          hint="Formatos: .xlsx, .xlsb, .xls, .csv · até 4 MB"
        />
        {lendo ? (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" /> Lendo a planilha e procurando clientes e DRE…
          </p>
        ) : null}
        {erro ? <FeedbackMessage variant="error">{erro}</FeedbackMessage> : null}
        <ComoFunciona />
      </div>
    );
  }

  if (!analise) {
    return (
      <div className="space-y-4">
        <FeedbackMessage variant="error">{erro}</FeedbackMessage>
        <Button variant="outline" onClick={recomecar}>
          <ArrowLeft /> Escolher outra planilha
        </Button>
      </div>
    );
  }

  const cl = analise.clientes;
  const dre = analise.dre;
  const layoutEscolhido = opcoes?.layoutDre ?? null;
  const clientesVisiveis = todosClientes ? cl.amostra : cl.amostra.slice(0, LINHAS_CLIENTES_INICIAIS);

  return (
    <div className={cn("space-y-6", lendo && "opacity-90")} aria-busy={lendo}>
      {/* Arquivo */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{analise.nomeArquivo}</p>
            <p className="text-xs text-muted-foreground">
              {analise.abasLidas.length} aba{analise.abasLidas.length === 1 ? "" : "s"} lida
              {analise.abasLidas.length === 1 ? "" : "s"}
              {lendo ? " · atualizando a prévia…" : ""}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={recomecar} disabled={importando}>
          <RefreshCw /> Trocar planilha
        </Button>
      </div>

      {erro ? <FeedbackMessage variant="error">{erro}</FeedbackMessage> : null}
      {analise.avisos.map((a) => (
        <FeedbackMessage key={a} variant="warning">
          {a}
        </FeedbackMessage>
      ))}

      {/* Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes</CardTitle>
          <CardDescription>
            Carteira de clientes encontrada na planilha (entrada, saída, valor mensal, motivo de churn).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cl.tabelas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Não encontrei uma lista de clientes nesta planilha. Procuro por uma tabela com o nome do
              cliente e a data de entrada. Se ela existir com outros títulos, me avise para eu ajustar.
            </p>
          ) : (
            <>
              {cl.tabelas.length > 1 ? (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Quais tabelas importar?</legend>
                  {cl.tabelas.map((t) => {
                    const marcada = opcoes?.abasClientes.includes(t.aba) ?? false;
                    return (
                      <label key={t.aba} className="flex cursor-pointer items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={marcada}
                          disabled={lendo || importando}
                          onChange={() => {
                            if (!opcoes) return;
                            const abas = marcada
                              ? opcoes.abasClientes.filter((a) => a !== t.aba)
                              : [...opcoes.abasClientes, t.aba];
                            pedir({ ...opcoes, abasClientes: abas });
                          }}
                        />
                        <span>
                          <span className="font-medium">{t.aba}</span>{" "}
                          <span className="text-muted-foreground">
                            — {t.total} clientes ({t.ativos} ativos, {t.churn} churn) · R${" "}
                            {formatCurrency(t.mrrAtivo).replace("R$", "").trim()}/mês ativo
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{cl.resumo.total} clientes</Badge>
                <Badge variant="success">{cl.resumo.ativos} ativos</Badge>
                <Badge variant="secondary">{cl.resumo.churn} churn</Badge>
                <Badge variant="outline">{formatCurrency(cl.resumo.mrrAtivo)} / mês (ativos)</Badge>
                <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
                <Badge variant="success">{cl.resumo.novos} novos</Badge>
                <Badge variant="warning">{cl.resumo.atualizar} a atualizar</Badge>
                <Badge variant="outline">{cl.resumo.iguais} já iguais</Badge>
              </div>

              {cl.resumo.total > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Saída</TableHead>
                        <TableHead className="text-right">Valor mensal</TableHead>
                        <TableHead>Situação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientesVisiveis.map((c, i) => (
                        <TableRow key={`${c.nome}-${c.entrada}-${i}`}>
                          <TableCell>
                            <span className="font-medium">{c.nome}</span>
                            {c.nicho ? (
                              <span className="ml-2 text-xs text-muted-foreground">{c.nicho}</span>
                            ) : null}
                            {c.avisos.length ? (
                              <span
                                className="ml-2 inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"
                                title={c.avisos.join(" · ")}
                              >
                                <AlertTriangle className="size-3" /> {c.avisos[0]}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell>{dataCurta(c.entrada)}</TableCell>
                          <TableCell>
                            {c.ativo ? <Badge variant="success">Ativo</Badge> : dataCurta(c.saida)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {c.mrr != null ? formatCurrency(c.mrr) : "—"}
                          </TableCell>
                          <TableCell>
                            {c.situacao === "novo" ? (
                              <Badge variant="success">Novo</Badge>
                            ) : c.situacao === "atualizar" ? (
                              <Badge variant="warning" title={c.mudancas.join(", ")}>
                                Atualiza: {c.mudancas.join(", ")}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Já está igual</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {cl.amostra.length > LINHAS_CLIENTES_INICIAIS ? (
                    <Button variant="ghost" size="sm" onClick={() => setTodosClientes((v) => !v)}>
                      {todosClientes ? "Mostrar menos" : `Mostrar todos (${cl.amostra.length})`}
                    </Button>
                  ) : null}
                  {cl.cortada ? (
                    <p className="text-xs text-muted-foreground">
                      A prévia mostra os {cl.amostra.length} primeiros; todos serão importados.
                    </p>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {/* DRE */}
      <Card>
        <CardHeader>
          <CardTitle>Resultado mensal (DRE)</CardTitle>
          <CardDescription>
            Receitas e despesas de cada mês. Viram lançamentos do Financeiro, e a DRE do portal passa a
            refletir esses meses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {dre.layouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Não encontrei uma DRE mensal nesta planilha (procuro linhas de receitas e despesas com os
              meses em colunas, ou um quadro por mês).
            </p>
          ) : (
            <>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Qual quadro usar?</legend>
                {dre.layouts.map((l) => (
                  <label
                    key={l.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                      layoutEscolhido === l.id ? "border-[var(--brand-gold)]/60 bg-muted/30" : "border-border/60",
                    )}
                  >
                    <input
                      type="radio"
                      name="layout-dre"
                      className="mt-1"
                      checked={layoutEscolhido === l.id}
                      disabled={lendo || importando}
                      onChange={() => {
                        if (!opcoes) return;
                        // Trocar o quadro refaz a escolha de meses (vem tudo marcado de novo).
                        pedir({ abasClientes: opcoes.abasClientes, layoutDre: l.id }, 0);
                      }}
                    />
                    <span className="space-y-0.5">
                      <span className="font-medium">{l.descricao}</span>
                      <span className="block text-xs text-muted-foreground">
                        {l.meses} mês(es) · {l.conferem} conferem com o total da planilha
                        {l.divergem ? ` · ${l.divergem} divergem` : ""}
                      </span>
                    </span>
                  </label>
                ))}
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                    layoutEscolhido === null ? "border-[var(--brand-gold)]/60 bg-muted/30" : "border-border/60",
                  )}
                >
                  <input
                    type="radio"
                    name="layout-dre"
                    className="mt-1"
                    checked={layoutEscolhido === null}
                    disabled={lendo || importando}
                    onChange={() => {
                      if (!opcoes) return;
                      pedir({ abasClientes: opcoes.abasClientes, layoutDre: null }, 0);
                    }}
                  />
                  <span className="font-medium">Não importar a DRE (só os clientes)</span>
                </label>
              </fieldset>

              {layoutEscolhido ? (
                <>
                  {dre.avisos.map((a) => (
                    <FeedbackMessage key={a} variant="warning">
                      {a}
                    </FeedbackMessage>
                  ))}

                  {dre.blocos.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Mês de cada quadro</p>
                      <p className="text-xs text-muted-foreground">
                        Neste formato cada quadro é um mês. Conferi o título e a ordem dos quadros; se algum
                        mês estiver errado, corrija aqui.
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {dre.blocos.map((b) => (
                          <label
                            key={b.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{b.titulo || `Quadro da linha ${b.linha}`}</span>
                              <span className="block text-xs text-muted-foreground">
                                linha {b.linha} · {b.deduzidoPor}
                              </span>
                            </span>
                            <input
                              type="month"
                              value={b.mes}
                              disabled={lendo || importando}
                              className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                              onChange={(e) => {
                                if (!opcoes || !e.target.value) return;
                                // Mudou o mês de um quadro: os meses marcados são refeitos.
                                pedir({
                                  abasClientes: opcoes.abasClientes,
                                  layoutDre: opcoes.layoutDre,
                                  mesesSobrepostos: opcoes.mesesSobrepostos,
                                  mesesDosBlocos: { ...opcoes.mesesDosBlocos, [b.id]: e.target.value },
                                });
                              }}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <TabelaMeses
                    meses={dre.meses}
                    desabilitado={lendo || importando}
                    onAlternar={(mes, marcar) => {
                      if (!opcoes) return;
                      const lista = marcar
                        ? [...new Set([...opcoes.mesesDre, mes])].sort()
                        : opcoes.mesesDre.filter((m) => m !== mes);
                      pedir({ ...opcoes, mesesDre: lista });
                    }}
                    onSomarMesmoAssim={(mes) => {
                      if (!opcoes) return;
                      pedir(
                        {
                          ...opcoes,
                          mesesDre: [...new Set([...opcoes.mesesDre, mes])].sort(),
                          mesesSobrepostos: [...new Set([...opcoes.mesesSobrepostos, mes])].sort(),
                        },
                        0,
                      );
                    }}
                  />

                  {dre.categoriasNovas.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Categorias novas ({dre.categoriasNovas.length})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Estas contas ainda não existem no Financeiro. Serão criadas já ligadas a uma linha
                        da DRE; você pode ajustar depois em Financeiro → Categorias.
                      </p>
                      <ul className="grid gap-1 text-sm sm:grid-cols-2">
                        {dre.categoriasNovas.map((c) => (
                          <li
                            key={`${c.tipo}-${c.nome}`}
                            className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-3 py-1.5"
                            title={c.motivo}
                          >
                            <span className="truncate">
                              {c.nome}{" "}
                              <span className="text-xs text-muted-foreground">
                                ({c.tipo === "receita" ? "receita" : "despesa"})
                              </span>
                            </span>
                            <span
                              className={cn(
                                "shrink-0 text-xs",
                                c.linhaDre ? "text-muted-foreground" : "text-amber-700 dark:text-amber-400",
                              )}
                            >
                              {nomeDaLinha(c.linhaDre)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmar */}
      <Card className="border-[var(--brand-gold)]/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="space-y-1 text-sm">
            <p className="font-medium">O que vai acontecer ao confirmar</p>
            <ul className="list-inside list-disc text-muted-foreground">
              <li>
                Clientes: {cl.resumo.novos} novos e {cl.resumo.atualizar} atualizados
                {cl.resumo.iguais ? ` (${cl.resumo.iguais} já estão iguais)` : ""}.
              </li>
              <li>
                {layoutEscolhido
                  ? `Financeiro: ${mesesAtivos.length} mês(es), ${lancamentosAGravar.criar} lançamentos novos e ${lancamentosAGravar.atualizar} atualizados.`
                  : "Financeiro: nada será importado."}
              </li>
              <li>Nada é apagado. Se você importar a mesma planilha de novo, nada é duplicado.</li>
            </ul>
          </div>
          <Button size="lg" onClick={confirmar} disabled={lendo || importando || nada}>
            {importando ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            {importando ? "Importando…" : nada ? "Nada para importar" : "Confirmar e importar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------------- partes */

function TabelaMeses({
  meses,
  desabilitado,
  onAlternar,
  onSomarMesmoAssim,
}: {
  meses: MesPrevio[];
  desabilitado: boolean;
  onAlternar: (mes: string, marcar: boolean) => void;
  onSomarMesmoAssim: (mes: string) => void;
}) {
  if (!meses.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Meses encontrados</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Mês</TableHead>
            <TableHead className="text-right">Receitas</TableHead>
            <TableHead className="text-right">Despesas</TableHead>
            <TableHead className="text-right">Resultado</TableHead>
            <TableHead>Confere?</TableHead>
            <TableHead>No portal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {meses.map((m) => {
            const ocupado = m.situacao === "ocupado";
            return (
              <TableRow key={m.mes} className={cn(ocupado && "text-muted-foreground")}>
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={`Importar ${rotuloMes(m.mes)}`}
                    checked={m.marcado && !ocupado}
                    disabled={desabilitado || ocupado}
                    onChange={(e) => onAlternar(m.mes, e.target.checked)}
                  />
                </TableCell>
                <TableCell className="font-medium">{rotuloMes(m.mes)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(m.receita)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(m.despesa)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(m.resultado)}</TableCell>
                <TableCell>
                  {m.confere === true ? (
                    <span
                      className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"
                      title="O resultado calculado bate com o resultado que está escrito na planilha."
                    >
                      <CheckCircle2 className="size-4" /> Sim
                    </span>
                  ) : m.confere === false ? (
                    <span
                      className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"
                      title={`A planilha informa resultado de ${formatCurrency(m.resultadoPlanilha ?? 0)}.`}
                    >
                      <AlertTriangle className="size-4" /> Diferença de{" "}
                      {formatCurrency(Math.abs(m.resultado - (m.resultadoPlanilha ?? 0)))}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem total na planilha</span>
                  )}
                </TableCell>
                <TableCell>
                  {ocupado ? (
                    <span className="flex flex-wrap items-center gap-2 text-xs">
                      Já tem {m.existentesDeOutraOrigem} lançamento(s) neste mês
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={desabilitado}
                        onClick={() => onSomarMesmoAssim(m.mes)}
                      >
                        Somar mesmo assim
                      </Button>
                    </span>
                  ) : m.situacao === "novo" ? (
                    <Badge variant="success">Mês novo</Badge>
                  ) : m.situacao === "atualiza" ? (
                    <Badge variant="warning">Atualiza ({m.atualizar})</Badge>
                  ) : (
                    <Badge variant="outline">Já importado</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground">
        Meses que já têm lançamentos feitos no portal ficam de fora para não contar duas vezes. “Somar
        mesmo assim” adiciona os valores da planilha por cima.
      </p>
    </div>
  );
}

function TelaResultado({
  resultado,
  tenantSlug,
  onNova,
}: {
  resultado: RespostaImportacao;
  tenantSlug: string;
  onNova: () => void;
}) {
  const r = resultado.resumo;
  const base = `/${tenantSlug}`;
  return (
    <div className="space-y-6">
      <Card className="border-emerald-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" /> Importação concluída
          </CardTitle>
          <CardDescription>Os dados já estão no portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>
              Clientes: {r.clientesCriados} novos, {r.clientesAtualizados} atualizados
              {r.clientesIguais ? `, ${r.clientesIguais} já estavam iguais` : ""}.
            </li>
            <li>
              Financeiro: {r.lancamentosCriados} lançamentos novos, {r.lancamentosAtualizados} atualizados
              {r.lancamentosMantidos ? `, ${r.lancamentosMantidos} já estavam iguais` : ""}
              {r.mesesImportados.length
                ? ` (${r.mesesImportados.map(rotuloMes).join(", ")})`
                : ""}
              .
            </li>
            {r.categoriasCriadas ? <li>{r.categoriasCriadas} categorias novas criadas.</li> : null}
          </ul>

          {r.mesesPulados.length > 0 ? (
            <FeedbackMessage variant="info">
              Meses que não foram importados:{" "}
              {r.mesesPulados.map((p) => `${rotuloMes(p.mes)} (${p.motivo})`).join("; ")}.
            </FeedbackMessage>
          ) : null}
          {resultado.avisos.map((a) => (
            <FeedbackMessage key={a} variant="warning">
              {a}
            </FeedbackMessage>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button render={<Link href={`${base}/painel-executivo`} />}>Ver o painel</Button>
            <Button variant="outline" render={<Link href={`${base}/clientes`} />}>
              Clientes
            </Button>
            <Button variant="outline" render={<Link href={`${base}/financeiro/dre`} />}>
              DRE
            </Button>
            <Button variant="ghost" onClick={onNova}>
              Importar outra planilha
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComoFunciona() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Como funciona</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>
          Envie a mesma planilha que você já usa para controlar a empresa. O portal procura sozinho a
          lista de clientes (entrada, saída, valor mensal) e a DRE mensal (receitas, custos e
          despesas), seja com os meses em colunas ou com um quadro por mês.
        </p>
        <p>
          Você confere a prévia antes de gravar. Nada é apagado, e importar a mesma planilha outra vez
          não duplica clientes nem lançamentos.
        </p>
        <p>Serve para agências, consultórios, clínicas e qualquer negócio com clientes recorrentes.</p>
      </CardContent>
    </Card>
  );
}
