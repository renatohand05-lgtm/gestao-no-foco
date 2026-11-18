"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Download, Pencil, Trash2, Upload } from "lucide-react";

import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SectionCard } from "@/components/ui/section-card";
import { excluirVendaDiaAction, importarVendasAction, salvarVendaDiaAction } from "@/lib/rede/actions";
import { brl2, somarDias, totaisDeVendas } from "@/lib/rede/calculo";
import { gerarCsv, lerNumero, lerVendasCsv, type ResultadoImportacao } from "@/lib/rede/csv";
import type { CanaisLoja, VendaDia } from "@/lib/rede/tipos";

type LojaForm = { id: string; slug: string; nome: string; canais: CanaisLoja };

type Props = {
  slug: string;
  lojas: LojaForm[];
  vendas: VendaDia[];
  editavel: boolean;
  hoje: string;
  rotuloPeriodo: string;
};

type Mensagem = { tipo: "success" | "error"; texto: string } | null;
const POR_PAGINA = 25;
const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export function VendasGestao({ slug, lojas, vendas, editavel, hoje, rotuloPeriodo }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Mensagem>(null);

  // formulário
  const [lojaId, setLojaId] = useState(lojas[0]?.id ?? "");
  const [data, setData] = useState(somarDias(hoje, -1));
  const [salao, setSalao] = useState("");
  const [delivery, setDelivery] = useState("");
  const [pedSalao, setPedSalao] = useState("");
  const [pedDelivery, setPedDelivery] = useState("");
  const [obs, setObs] = useState("");

  // tabela
  const [pagina, setPagina] = useState(0);
  const [excluir, setExcluir] = useState<VendaDia | null>(null);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  // importação
  const [textoCsv, setTextoCsv] = useState("");
  const [previa, setPrevia] = useState<ResultadoImportacao | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  const lojaAtual = lojas.find((l) => l.id === lojaId);
  const nomeLoja = useMemo(() => new Map(lojas.map((l) => [l.id, l.nome] as const)), [lojas]);
  const mostraSalao = lojaAtual?.canais !== "delivery";
  const mostraDelivery = lojaAtual?.canais !== "salao";

  const nSalao = lerNumero(salao) ?? 0;
  const nDelivery = lerNumero(delivery) ?? 0;
  const nPedidos = (lerNumero(pedSalao) ?? 0) + (lerNumero(pedDelivery) ?? 0);
  const totalDia = nSalao + nDelivery;

  const ordenadas = useMemo(() => [...vendas].sort((a, b) => b.data.localeCompare(a.data) || (nomeLoja.get(a.lojaId) ?? "").localeCompare(nomeLoja.get(b.lojaId) ?? "", "pt-BR")), [vendas, nomeLoja]);
  const totais = useMemo(() => totaisDeVendas(vendas), [vendas]);
  const paginas = Math.max(1, Math.ceil(ordenadas.length / POR_PAGINA));
  const visiveis = ordenadas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  const limpar = () => {
    setSalao("");
    setDelivery("");
    setPedSalao("");
    setPedDelivery("");
    setObs("");
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const entrada = {
      lojaId,
      data,
      salao: mostraSalao ? lerNumero(salao) : 0,
      delivery: mostraDelivery ? lerNumero(delivery) : 0,
      pedidosSalao: mostraSalao ? lerNumero(pedSalao) : 0,
      pedidosDelivery: mostraDelivery ? lerNumero(pedDelivery) : 0,
      observacao: obs,
    };
    if (entrada.salao == null || entrada.delivery == null || entrada.pedidosSalao == null || entrada.pedidosDelivery == null) {
      setMsg({ tipo: "error", texto: "Confira os números: use apenas dígitos, vírgula ou ponto." });
      return;
    }
    iniciar(async () => {
      const r = await salvarVendaDiaAction(slug, { ...entrada, salao: entrada.salao!, delivery: entrada.delivery!, pedidosSalao: entrada.pedidosSalao!, pedidosDelivery: entrada.pedidosDelivery! });
      if (r.success) {
        setMsg({ tipo: "success", texto: `Venda de ${nomeLoja.get(lojaId)} em ${br(data)} salva.` });
        limpar();
        router.refresh();
      } else setMsg({ tipo: "error", texto: r.error });
    });
  };

  const editar = (v: VendaDia) => {
    setLojaId(v.lojaId);
    setData(v.data);
    setSalao(String(v.salao).replace(".", ","));
    setDelivery(String(v.delivery).replace(".", ","));
    setPedSalao(String(v.pedidosSalao));
    setPedDelivery(String(v.pedidosDelivery));
    setMsg(null);
    document.getElementById("vendas-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const confirmarExclusao = () => {
    if (!excluir) return;
    setErroExcluir(null);
    iniciar(async () => {
      const r = await excluirVendaDiaAction(slug, excluir.lojaId, excluir.data);
      if (r.success) {
        setExcluir(null);
        setMsg({ tipo: "success", texto: "Lançamento excluído." });
        router.refresh();
      } else setErroExcluir(r.error);
    });
  };

  const lerArquivo = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 2_000_000) {
      setMsg({ tipo: "error", texto: "Arquivo grande demais (máximo 2 MB)." });
      return;
    }
    const t = await f.text();
    setTextoCsv(t);
    setPrevia(lerVendasCsv(t, lojas, hoje));
  };

  const importar = () => {
    if (!previa || previa.linhas.length === 0) return;
    setMsg(null);
    iniciar(async () => {
      const r = await importarVendasAction(slug, previa.linhas);
      if (r.success) {
        setMsg({ tipo: "success", texto: `${r.importadas} lançamentos importados.${previa.erros.length ? ` ${previa.erros.length} linhas ignoradas por erro.` : ""}` });
        setTextoCsv("");
        setPrevia(null);
        if (arquivo.current) arquivo.current.value = "";
        router.refresh();
      } else setMsg({ tipo: "error", texto: r.error });
    });
  };

  const baixarModelo = () => {
    const l = lojas[0];
    const csv = gerarCsv([
      ["loja", "data", "salao", "delivery", "pedidos salao", "pedidos delivery"],
      [l?.nome ?? "Nome da loja", somarDias(hoje, -1), 0, 0, 0, 0],
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-vendas-por-dia.csv";
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const linhasExport: (string | number | null)[][] = [
    ["Loja", "Data", "Salão", "Delivery", "Total", "Pedidos salão", "Pedidos delivery", "Ticket médio"],
    ...ordenadas.map((v) => [nomeLoja.get(v.lojaId) ?? v.lojaId, v.data, v.salao, v.delivery, v.salao + v.delivery, v.pedidosSalao, v.pedidosDelivery, v.pedidosSalao + v.pedidosDelivery > 0 ? Math.round(((v.salao + v.delivery) / (v.pedidosSalao + v.pedidosDelivery)) * 100) / 100 : null]),
  ];

  return (
    <div className="space-y-5">
      {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}

      {editavel ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div id="vendas-form" className="scroll-mt-24">
            <SectionCard title="Lançar vendas do dia" description="Se já existir lançamento da loja nesse dia, ele é atualizado (nunca duplica).">
              <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="v-loja">Loja</Label>
                  <NativeSelect id="v-loja" value={lojaId} onChange={(e) => setLojaId(e.target.value)} required>
                    {lojas.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="v-data">Data</Label>
                  <Input id="v-data" type="date" value={data} max={hoje} onChange={(e) => setData(e.target.value)} required />
                </div>
                {mostraSalao ? (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="v-salao">Venda do salão (R$)</Label>
                      <Input id="v-salao" inputMode="decimal" placeholder="0,00" value={salao} onChange={(e) => setSalao(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="v-ps">Pedidos do salão</Label>
                      <Input id="v-ps" inputMode="numeric" placeholder="0" value={pedSalao} onChange={(e) => setPedSalao(e.target.value)} />
                    </div>
                  </>
                ) : null}
                {mostraDelivery ? (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="v-del">Venda do delivery (R$)</Label>
                      <Input id="v-del" inputMode="decimal" placeholder="0,00" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="v-pd">Pedidos do delivery</Label>
                      <Input id="v-pd" inputMode="numeric" placeholder="0" value={pedDelivery} onChange={(e) => setPedDelivery(e.target.value)} />
                    </div>
                  </>
                ) : null}
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="v-obs">Observação (opcional)</Label>
                  <Input id="v-obs" maxLength={300} value={obs} onChange={(e) => setObs(e.target.value)} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                  <p className="text-sm text-muted-foreground tabular-nums">
                    Total do dia: <strong className="text-foreground">{brl2(totalDia)}</strong>
                    {nPedidos > 0 ? ` · ticket ${brl2(totalDia / nPedidos)}` : ""}
                  </p>
                  <Button type="submit" disabled={pendente || !lojaId}>
                    {pendente ? "Salvando…" : "Salvar lançamento"}
                  </Button>
                </div>
              </form>
            </SectionCard>
          </div>

          <SectionCard title="Importar planilha (CSV)" description="Colunas: loja, data, salão, delivery, pedidos salão, pedidos delivery. Reimportar o mesmo arquivo não duplica.">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <input ref={arquivo} type="file" accept=".csv,.txt,text/csv" className="sr-only" id="v-arquivo" onChange={(e) => void lerArquivo(e.target.files?.[0])} />
                <Button type="button" variant="outline" size="sm" onClick={() => arquivo.current?.click()}>
                  <Upload aria-hidden /> Escolher arquivo
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={baixarModelo}>
                  <Download aria-hidden /> Baixar modelo
                </Button>
              </div>
              <div className="space-y-1">
                <Label htmlFor="v-csv">…ou cole o conteúdo aqui</Label>
                <textarea
                  id="v-csv"
                  className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  value={textoCsv}
                  onChange={(e) => {
                    setTextoCsv(e.target.value);
                    setPrevia(e.target.value.trim() ? lerVendasCsv(e.target.value, lojas, hoje) : null);
                  }}
                  placeholder={"loja;data;salao;delivery;pedidos salao;pedidos delivery\nBrooklyn;01/10/2026;6.611,00;23.038,00;103;303"}
                />
              </div>
              {previa ? (
                <div className="space-y-2 text-sm" aria-live="polite">
                  <p>
                    <strong>{previa.linhas.length}</strong> linhas prontas · <strong className={previa.erros.length ? "text-destructive" : ""}>{previa.erros.length}</strong> com erro (de {previa.total}).
                  </p>
                  {previa.erros.length > 0 ? (
                    <ul className="max-h-32 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs text-destructive">
                      {previa.erros.slice(0, 20).map((er, i) => (
                        <li key={i}>{er.linha > 0 ? `Linha ${er.linha}: ` : ""}{er.mensagem}</li>
                      ))}
                      {previa.erros.length > 20 ? <li>…e mais {previa.erros.length - 20}.</li> : null}
                    </ul>
                  ) : null}
                  <Button type="button" size="sm" onClick={importar} disabled={pendente || previa.linhas.length === 0}>
                    {pendente ? "Importando…" : `Importar ${previa.linhas.length} linhas${previa.erros.length ? " (ignorando as com erro)" : ""}`}
                  </Button>
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      ) : (
        <FeedbackMessage variant="info">Seu perfil pode consultar as vendas, mas não lançar ou alterar.</FeedbackMessage>
      )}

      <SectionCard
        title={`Histórico — ${rotuloPeriodo}`}
        description={`${ordenadas.length} lançamentos · ${brl2(totais.fat)} no período${totais.ticket != null ? ` · ticket médio ${brl2(totais.ticket)}` : ""}`}
      >
        <div className="mb-3">
          <AcoesExportar arquivo={`vendas-${rotuloPeriodo.replace(/[^0-9a-z]+/gi, "-")}.csv`} linhas={linhasExport} />
        </div>
        {ordenadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma venda lançada neste período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Data</th>
                  <th className="py-2 pr-3 font-medium">Loja</th>
                  <th className="py-2 pr-3 text-right font-medium">Salão</th>
                  <th className="py-2 pr-3 text-right font-medium">Delivery</th>
                  <th className="py-2 pr-3 text-right font-medium">Total</th>
                  <th className="py-2 pr-3 text-right font-medium">Pedidos</th>
                  <th className="py-2 pr-3 text-right font-medium">Ticket</th>
                  {editavel ? <th className="py-2 text-right font-medium">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {visiveis.map((v) => {
                  const ped = v.pedidosSalao + v.pedidosDelivery;
                  return (
                    <tr key={`${v.lojaId}-${v.data}`} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 tabular-nums">{br(v.data)}</td>
                      <td className="py-2 pr-3">{nomeLoja.get(v.lojaId) ?? "—"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{brl2(v.salao)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{brl2(v.delivery)}</td>
                      <td className="py-2 pr-3 text-right font-medium tabular-nums">{brl2(v.salao + v.delivery)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{ped}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{ped > 0 ? brl2((v.salao + v.delivery) / ped) : "—"}</td>
                      {editavel ? (
                        <td className="py-2 text-right">
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Editar ${nomeLoja.get(v.lojaId)} em ${br(v.data)}`} onClick={() => editar(v)}>
                            <Pencil aria-hidden />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Excluir ${nomeLoja.get(v.lojaId)} em ${br(v.data)}`} onClick={() => { setErroExcluir(null); setExcluir(v); }}>
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
        {paginas > 1 ? (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Página {pagina + 1} de {paginas}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
                Anterior
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={pagina >= paginas - 1} onClick={() => setPagina((p) => p + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <ConfirmDialog
        open={excluir != null}
        onOpenChange={(o) => !o && setExcluir(null)}
        title="Excluir lançamento?"
        description={excluir ? `${nomeLoja.get(excluir.lojaId)} em ${br(excluir.data)} (${brl2(excluir.salao + excluir.delivery)}). A exclusão fica registrada no histórico de alterações.` : ""}
        confirmLabel="Excluir"
        loading={pendente}
        error={erroExcluir}
        onConfirm={confirmarExclusao}
      />
    </div>
  );
}
