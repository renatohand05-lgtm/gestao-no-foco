"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SectionCard } from "@/components/ui/section-card";
import { excluirDreLancamentoAction, restaurarPremissasAction, salvarDreLancamentoAction, salvarPremissasAction } from "@/lib/rede/actions-financeiro";
import { brl, brl2 } from "@/lib/rede/calculo";
import { lerNumero } from "@/lib/rede/csv";
import { linhasCsvComparativo, premissasPadrao, type FonteLinha, type LinhaComparativo } from "@/lib/rede/financeiro";
import { LINHAS_DRE_LANCAVEIS, type LancamentoDre, type LinhaDreKey, type PremissasDre, type PremissasDreRow } from "@/lib/rede/tipos";
import { cn } from "@/lib/utils";

type Msg = { tipo: "success" | "error"; texto: string } | null;
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const paraTexto = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));
const sinalBrl = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${brl(Math.abs(v))}`;

type LojaRef = { id: string; nome: string };

/* ============================================================ orçado × realizado */

export type OpcaoComparativo = { id: string; nome: string; linhas: LinhaComparativo[]; temOrcado: boolean; semMetaMotivo?: string };

export function ComparativoDre({ opcoes, rotuloMes, arquivo }: { opcoes: OpcaoComparativo[]; rotuloMes: string; arquivo: string }) {
  const [id, setId] = useState(opcoes[0]?.id ?? "");
  const atual = opcoes.find((o) => o.id === id) ?? opcoes[0];
  if (!atual) {
    return (
      <SectionCard title="Orçado × realizado" description="Compara o DRE pela meta de faturamento do mês com o DRE do que foi vendido.">
        <p className="text-sm text-muted-foreground">Nenhuma loja com vendas no mês.</p>
      </SectionCard>
    );
  }
  return (
    <SectionCard title={`Orçado × realizado — ${rotuloMes}`} description="Orçado = meta de faturamento do mês + premissas. Realizado = vendas lançadas, contagens de CMV, indicadores e lançamentos reais; o que falta é estimado pela premissa.">
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-48 space-y-1">
            <Label htmlFor="cp-escopo">Ver</Label>
            <NativeSelect id="cp-escopo" value={atual.id} onChange={(e) => setId(e.target.value)}>
              {opcoes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </NativeSelect>
          </div>
          <AcoesExportar arquivo={arquivo} linhas={linhasCsvComparativo(`${atual.nome} — ${rotuloMes}`, atual.linhas) as (string | number | null)[][]} imprimir={false} />
        </div>
        {!atual.temOrcado ? (
          <FeedbackMessage variant="info">{atual.semMetaMotivo ?? "Sem meta de faturamento no mês: defina em Metas e indicadores para ver o orçado."} O realizado aparece abaixo.</FeedbackMessage>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Linha</th>
                <th className="py-2 pr-3 text-right font-medium">Orçado</th>
                <th className="py-2 pr-3 text-right font-medium">Realizado</th>
                <th className="py-2 pr-3 text-right font-medium">Variação</th>
                <th className="py-2 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {atual.linhas.map((l) => (
                <tr key={l.k} className={cn("border-b border-border/60 last:border-0", (l.tipo === "tot" || l.tipo === "res") && "font-semibold", l.tipo === "res" && "bg-muted/40")}>
                  <td className={cn("py-2 pr-3", l.tipo === "sub" && "pl-4 text-muted-foreground")}>{l.nome}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{l.orcado != null ? brl(l.orcado) : "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{brl(l.realizado)}</td>
                  <td className={cn("py-2 pr-3 text-right tabular-nums", l.favoravel === true && "text-emerald-700 dark:text-emerald-400", l.favoravel === false && "text-red-600 dark:text-red-400")}>{l.variacao != null ? sinalBrl(l.variacao) : "—"}</td>
                  <td className="py-2 text-right text-xs tabular-nums text-muted-foreground">{l.variacaoPct != null ? `${l.variacaoPct > 0 ? "+" : ""}${nf1.format(l.variacaoPct)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">Verde = melhor que o orçado (receita acima ou custo abaixo); vermelho = pior. Custos aparecem como valores positivos.</p>
      </div>
    </SectionCard>
  );
}

/* ============================================================ premissas */

const CAMPOS: { k: keyof PremissasDre; rotulo: string; un: "%" | "R$" | "base" }[] = [
  { k: "cmv", rotulo: "CMV", un: "%" },
  { k: "pessoal", rotulo: "Folha de pagamento", un: "%" },
  { k: "impostos", rotulo: "Impostos", un: "%" },
  { k: "custoDelivery", rotulo: "Custos de delivery", un: "%" },
  { k: "baseDelivery", rotulo: "Custo de delivery incide sobre", un: "base" },
  { k: "manutencao", rotulo: "Manutenção", un: "%" },
  { k: "marketing", rotulo: "Marketing, royalties, escritório e fundo", un: "%" },
  { k: "cto", rotulo: "CTO (custo de ocupação) por mês", un: "R$" },
  { k: "agua", rotulo: "Água por mês", un: "R$" },
  { k: "energia", rotulo: "Energia por mês", un: "R$" },
  { k: "mixDelivery", rotulo: "Participação do delivery no orçado", un: "%" },
];

export function PremissasDreEditor({ slug, lojas, rows, editaRede, lojasEditaveis }: { slug: string; lojas: LojaRef[]; rows: PremissasDreRow[]; editaRede: boolean; lojasEditaveis: string[] }) {
  const [escopo, setEscopo] = useState("rede");
  const lojaId = escopo === "rede" ? null : escopo;
  const editavel = lojaId ? lojasEditaveis.includes(lojaId) : editaRede;
  const padrao = useMemo(() => premissasPadrao(rows), [rows]);
  const linhaLoja = lojaId ? rows.find((r) => r.lojaId === lojaId) : undefined;
  // Remonta o formulário quando muda o escopo ou os dados salvos.
  const chave = `${escopo}|${JSON.stringify(lojaId ? (linhaLoja ?? null) : padrao)}`;
  return (
    <SectionCard
      title="Premissas do DRE"
      description="Valores usados para estimar o que ainda não foi lançado e para montar o orçado. Cada loja pode ter exceções; campo vazio na loja = usa o padrão da rede."
    >
      <div className="space-y-4">
        <div className="max-w-sm space-y-1">
          <Label htmlFor="pr-escopo">Premissas de</Label>
          <NativeSelect id="pr-escopo" value={escopo} onChange={(e) => setEscopo(e.target.value)}>
            <option value="rede">Padrão da rede (vale para todas as lojas)</option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                Exceções só de {l.nome}
                {rows.some((r) => r.lojaId === l.id) ? " ●" : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
        {!editavel ? <FeedbackMessage variant="info">Seu perfil pode consultar estas premissas, mas não alterá-las{lojaId ? " nesta loja" : ""}.</FeedbackMessage> : null}
        <FormularioPremissas key={chave} slug={slug} lojaId={lojaId} padrao={padrao} linhaLoja={linhaLoja ?? null} editavel={editavel} />
      </div>
    </SectionCard>
  );
}

function FormularioPremissas({ slug, lojaId, padrao, linhaLoja, editavel }: { slug: string; lojaId: string | null; padrao: PremissasDre; linhaLoja: PremissasDreRow | null; editavel: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [confirmarRestaurar, setConfirmarRestaurar] = useState(false);
  const [erroRestaurar, setErroRestaurar] = useState<string | null>(null);
  const inicial = (k: keyof PremissasDre): string => {
    const v = lojaId ? linhaLoja?.[k] : padrao[k];
    if (v == null) return "";
    return k === "baseDelivery" ? String(v) : paraTexto(v as number);
  };
  const [valores, setValores] = useState<Record<string, string>>(() => Object.fromEntries(CAMPOS.map((c) => [c.k, inicial(c.k)])));
  const alterou = CAMPOS.some((c) => valores[c.k] !== inicial(c.k));

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const campos: Record<string, number | string | null> = {};
    for (const c of CAMPOS) {
      const bruto = valores[c.k] ?? "";
      if (c.un === "base") campos[c.k] = bruto === "" ? null : bruto;
      else if (bruto.trim() === "") campos[c.k] = null;
      else {
        const n = lerNumero(bruto);
        if (n == null) {
          setMsg({ tipo: "error", texto: `${c.rotulo}: use apenas dígitos, vírgula ou ponto.` });
          return;
        }
        campos[c.k] = n;
      }
    }
    iniciar(async () => {
      const r = await salvarPremissasAction(slug, { lojaId, campos: campos as never });
      if (r.success) {
        setMsg({ tipo: "success", texto: lojaId ? "Exceções da loja salvas." : "Padrão da rede salvo." });
        router.refresh();
      } else setMsg({ tipo: "error", texto: r.error });
    });
  };

  const restaurar = () => {
    setErroRestaurar(null);
    iniciar(async () => {
      const r = await restaurarPremissasAction(slug, lojaId);
      if (r.success) {
        setConfirmarRestaurar(false);
        setMsg({ tipo: "success", texto: lojaId ? "Exceções removidas: a loja volta ao padrão da rede." : "Padrão da rede restaurado para o modelo original." });
        router.refresh();
      } else setErroRestaurar(r.error);
    });
  };

  return (
    <form onSubmit={salvar} className="space-y-3">
      {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CAMPOS.map((c) => {
          const id = `pr-${c.k}`;
          const herdado = lojaId && (valores[c.k] ?? "") === "";
          return (
            <div key={c.k} className="space-y-1">
              <Label htmlFor={id}>
                {c.rotulo} {c.un === "%" ? "(%)" : c.un === "R$" ? "(R$)" : ""}
              </Label>
              {c.un === "base" ? (
                <NativeSelect id={id} value={valores[c.k] ?? ""} disabled={!editavel} onChange={(e) => setValores((v) => ({ ...v, [c.k]: e.target.value }))}>
                  {lojaId ? <option value="">Padrão da rede ({padrao.baseDelivery === "delivery" ? "venda do delivery" : "faturamento total"})</option> : null}
                  <option value="delivery">Venda do delivery</option>
                  <option value="total">Faturamento total</option>
                </NativeSelect>
              ) : (
                <Input id={id} inputMode="decimal" value={valores[c.k] ?? ""} disabled={!editavel} placeholder={lojaId ? `padrão: ${paraTexto(padrao[c.k] as number)}` : "0"} onChange={(e) => setValores((v) => ({ ...v, [c.k]: e.target.value }))} />
              )}
              {herdado && c.un !== "base" ? <p className="text-[11px] text-muted-foreground">usa o padrão da rede</p> : null}
            </div>
          );
        })}
      </div>
      {editavel ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => { setErroRestaurar(null); setConfirmarRestaurar(true); }} disabled={pendente}>
            {lojaId ? "Remover exceções da loja" : "Restaurar modelo original"}
          </Button>
          <Button type="submit" disabled={pendente || !alterou}>
            {pendente ? "Salvando…" : lojaId ? "Salvar exceções" : "Salvar padrão da rede"}
          </Button>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmarRestaurar}
        onOpenChange={setConfirmarRestaurar}
        title={lojaId ? "Remover as exceções desta loja?" : "Restaurar o modelo original?"}
        description={lojaId ? "A loja volta a usar o padrão da rede em todos os campos. A alteração fica registrada no histórico." : "O padrão da rede volta a CMV 21%, folha 19%, impostos 10%, delivery 28% sobre a venda do delivery, manutenção 1,5%, marketing 7%, CTO R$ 12.000, água R$ 1.500 e energia R$ 4.500. As exceções das lojas não mudam."}
        confirmLabel="Restaurar"
        loading={pendente}
        error={erroRestaurar}
        onConfirm={restaurar}
      />
    </form>
  );
}

/* ============================================================ lançamentos reais */

export type AtualPorLinha = Record<string, Partial<Record<LinhaDreKey, { valor: number; fonte: FonteLinha }>>>;

const ROTULO_FONTE: Record<FonteLinha, string> = { lancado: "lançado", contagens: "das contagens de CMV", indicador: "do indicador do mês", premissa: "estimativa pela premissa" };

export function LancamentosDre({ slug, mes, lojas, lancamentos, atuais, editavel }: { slug: string; mes: string; lojas: LojaRef[]; lancamentos: LancamentoDre[]; atuais: AtualPorLinha; editavel: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [lojaId, setLojaId] = useState(lojas[0]?.id ?? "");
  const [linha, setLinha] = useState<LinhaDreKey>("impostos");
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const [excluir, setExcluir] = useState<LancamentoDre | null>(null);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  const nomeLoja = useMemo(() => new Map(lojas.map((l) => [l.id, l.nome] as const)), [lojas]);
  const nomeLinha = useMemo(() => new Map(LINHAS_DRE_LANCAVEIS.map((l) => [l.k, l.nome] as const)), []);
  const hoje = atuais[lojaId]?.[linha];
  const rotuloMes = `${mes.slice(5, 7)}/${mes.slice(0, 4)}`;

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const n = lerNumero(valor);
    if (n == null) {
      setMsg({ tipo: "error", texto: "Informe o valor em reais (apenas dígitos, vírgula ou ponto)." });
      return;
    }
    iniciar(async () => {
      const r = await salvarDreLancamentoAction(slug, { lojaId, mes, linha, valor: n, observacao: obs });
      if (r.success) {
        setMsg({ tipo: "success", texto: `${nomeLinha.get(linha)} de ${nomeLoja.get(lojaId)} em ${rotuloMes} lançado. Passa a valer no lugar da estimativa.` });
        setValor("");
        setObs("");
        router.refresh();
      } else setMsg({ tipo: "error", texto: r.error });
    });
  };

  const editar = (l: LancamentoDre) => {
    setLojaId(l.lojaId);
    setLinha(l.linha);
    setValor(paraTexto(l.valor));
    setObs(l.observacao ?? "");
    setMsg(null);
    document.getElementById("dre-lanc-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const confirmarExclusao = () => {
    if (!excluir) return;
    setErroExcluir(null);
    iniciar(async () => {
      const r = await excluirDreLancamentoAction(slug, excluir.id);
      if (r.success) {
        setExcluir(null);
        setMsg({ tipo: "success", texto: "Lançamento excluído: a linha volta a ser estimada pela premissa." });
        router.refresh();
      } else setErroExcluir(r.error);
    });
  };

  const ordenados = [...lancamentos].sort((a, b) => (nomeLoja.get(a.lojaId) ?? "").localeCompare(nomeLoja.get(b.lojaId) ?? "", "pt-BR") || a.linha.localeCompare(b.linha));

  return (
    <SectionCard title={`Lançamentos reais — ${rotuloMes}`} description="Despesa efetivamente paga no mês, em reais. Cada lançamento substitui a estimativa da linha (nunca soma, para não contar duas vezes). Apagar volta à estimativa.">
      <div className="space-y-4">
        {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}
        {editavel ? (
          <form id="dre-lanc-form" onSubmit={salvar} className="grid scroll-mt-24 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="space-y-1 lg:col-span-2">
              <Label htmlFor="dl-linha">Linha do DRE</Label>
              <NativeSelect id="dl-linha" value={linha} onChange={(e) => setLinha(e.target.value as LinhaDreKey)}>
                {LINHAS_DRE_LANCAVEIS.map((l) => (
                  <option key={l.k} value={l.k}>
                    {l.nome}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="dl-valor">Valor pago no mês (R$)</Label>
              <Input id="dl-valor" inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} required />
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="dl-obs">Observação (opcional)</Label>
              <Input id="dl-obs" maxLength={300} value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
            <div className="flex items-end justify-end">
              <Button type="submit" disabled={pendente || !lojaId}>
                {pendente ? "Salvando…" : "Salvar lançamento"}
              </Button>
            </div>
            {hoje ? (
              <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">
                Hoje no DRE de {nomeLoja.get(lojaId)}: <strong className="tabular-nums">{brl2(hoje.valor)}</strong> ({ROTULO_FONTE[hoje.fonte]}).
              </p>
            ) : null}
          </form>
        ) : (
          <FeedbackMessage variant="info">Seu perfil pode consultar o DRE, mas não lançar ou alterar despesas.</FeedbackMessage>
        )}

        {ordenados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma despesa lançada neste mês: todas as linhas de custo estão estimadas pelas premissas (ou vêm das contagens e indicadores).</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Loja</th>
                  <th className="py-2 pr-3 font-medium">Linha</th>
                  <th className="py-2 pr-3 text-right font-medium">Valor</th>
                  <th className="py-2 pr-3 font-medium">Observação</th>
                  {editavel ? <th className="py-2 text-right font-medium">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {ordenados.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-medium">
                      {nomeLoja.get(l.lojaId) ?? "—"}
                      {l.origem === "exemplo" ? <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">EXEMPLO</span> : null}
                    </td>
                    <td className="py-2 pr-3">{nomeLinha.get(l.linha)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{brl2(l.valor)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{l.observacao ?? ""}</td>
                    {editavel ? (
                      <td className="py-2 text-right">
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Editar ${nomeLinha.get(l.linha)} de ${nomeLoja.get(l.lojaId)}`} onClick={() => editar(l)}>
                          <Pencil aria-hidden />
                        </Button>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Excluir ${nomeLinha.get(l.linha)} de ${nomeLoja.get(l.lojaId)}`} onClick={() => { setErroExcluir(null); setExcluir(l); }}>
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
      </div>
      <ConfirmDialog
        open={excluir != null}
        onOpenChange={(o) => !o && setExcluir(null)}
        title="Excluir lançamento?"
        description={excluir ? `${nomeLoja.get(excluir.lojaId)} · ${nomeLinha.get(excluir.linha)} · ${brl2(excluir.valor)}. A linha volta a ser estimada pela premissa. A exclusão fica registrada no histórico.` : ""}
        confirmLabel="Excluir"
        loading={pendente}
        error={erroExcluir}
        onConfirm={confirmarExclusao}
      />
    </SectionCard>
  );
}

