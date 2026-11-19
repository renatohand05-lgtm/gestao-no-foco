"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { StatusPill } from "@/components/rede/status";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SectionCard } from "@/components/ui/section-card";
import { excluirCmvAction, salvarCmvAction } from "@/lib/rede/actions-financeiro";
import { brl, brl2, pct1, somarDias } from "@/lib/rede/calculo";
import { lerNumero } from "@/lib/rede/csv";
import { cmvPercentual, cmvReais, desvioItemPct, dispersaoPP, REGRA_CMV, statusDispersao, statusItem, type ContagemCalculada } from "@/lib/rede/financeiro";
import type { CmvItem, CmvSemana } from "@/lib/rede/tipos";

type Msg = { tipo: "success" | "error"; texto: string } | null;
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const texto = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const sinal = (v: number) => `${v > 0 ? "+" : ""}${nf1.format(v)}`;

type LojaRef = { id: string; nome: string };
type ItemForm = { item: string; teorico: string; real: string };

type Props = {
  slug: string;
  lojas: LojaRef[];
  semana: string;
  hoje: string;
  /** Contagens calculadas das últimas semanas (a da semana em foco e as anteriores, para sugerir o estoque inicial). */
  calc: ContagemCalculada[];
  itens: CmvItem[];
  vendasModulo: Record<string, number>;
  editavel: boolean;
  tolerancia: number;
  /** Loja pré-selecionada (filtro da tela). */
  lojaInicial: string | null;
};

export function CmvGestao({ slug, lojas, semana, hoje, calc, itens, vendasModulo, editavel, tolerancia, lojaInicial }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [lojaId, setLojaId] = useState(lojaInicial && lojas.some((l) => l.id === lojaInicial) ? lojaInicial : (lojas[0]?.id ?? ""));
  const [excluir, setExcluir] = useState<ContagemCalculada | null>(null);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  const nomeLoja = useMemo(() => new Map(lojas.map((l) => [l.id, l.nome] as const)), [lojas]);
  const daSemana = useMemo(() => calc.filter((c) => c.contagem.semana === semana).sort((a, b) => (nomeLoja.get(a.contagem.lojaId) ?? "").localeCompare(nomeLoja.get(b.contagem.lojaId) ?? "", "pt-BR")), [calc, semana, nomeLoja]);
  const registro = daSemana.find((c) => c.contagem.lojaId === lojaId)?.contagem ?? null;
  const anterior = calc.find((c) => c.contagem.lojaId === lojaId && c.contagem.semana === somarDias(semana, -7))?.contagem ?? null;
  const itensDaLoja = itens.filter((i) => i.lojaId === lojaId);
  const futura = semana > hoje;

  const confirmarExclusao = () => {
    if (!excluir) return;
    setErroExcluir(null);
    iniciar(async () => {
      const r = await excluirCmvAction(slug, excluir.contagem.lojaId, excluir.contagem.semana);
      if (r.success) {
        setExcluir(null);
        setMsg({ tipo: "success", texto: "Contagem excluída." });
        router.refresh();
      } else setErroExcluir(r.error);
    });
  };

  return (
    <div className="space-y-5">
      {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}

      {editavel ? (
        <SectionCard title={`Contagem da semana de ${ddmm(semana)}`} description="Se a loja já tem contagem nesta semana, ela é corrigida (nunca duplica). O estoque inicial é sugerido a partir do estoque final da semana anterior.">
          <div className="mb-3 max-w-xs space-y-1">
            <Label htmlFor="cm-loja">Loja</Label>
            <NativeSelect id="cm-loja" value={lojaId} onChange={(e) => { setLojaId(e.target.value); setMsg(null); }}>
              {lojas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                  {daSemana.some((c) => c.contagem.lojaId === l.id) ? " ✓" : ""}
                </option>
              ))}
            </NativeSelect>
          </div>
          {futura ? (
            <FeedbackMessage variant="info">Esta semana ainda não começou: escolha uma semana que já começou para lançar a contagem.</FeedbackMessage>
          ) : lojaId ? (
            <FormularioContagem
              key={`${lojaId}|${semana}|${registro?.id ?? "novo"}`}
              slug={slug}
              lojaId={lojaId}
              nomeLoja={nomeLoja.get(lojaId) ?? ""}
              semana={semana}
              registro={registro}
              anterior={anterior}
              itensIniciais={itensDaLoja}
              vendasModulo={vendasModulo[lojaId] ?? null}
              tolerancia={tolerancia}
              pendente={pendente}
              aoSalvar={(m) => {
                setMsg(m);
                if (m.tipo === "success") router.refresh();
              }}
              iniciar={iniciar}
            />
          ) : (
            <FeedbackMessage variant="info">Nenhuma loja disponível para contagem.</FeedbackMessage>
          )}
        </SectionCard>
      ) : (
        <FeedbackMessage variant="info">Seu perfil pode consultar o CMV, mas não lançar ou alterar contagens.</FeedbackMessage>
      )}

      <SectionCard title={`Contagens da semana de ${ddmm(semana)}`} description="Vendas, estoque inicial, compras, estoque final e CMV de cada loja contada.">
        {daSemana.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma contagem lançada nesta semana.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Loja</th>
                  <th className="py-2 pr-3 text-right font-medium">Vendas</th>
                  <th className="py-2 pr-3 text-right font-medium">Est. inicial</th>
                  <th className="py-2 pr-3 text-right font-medium">Compras</th>
                  <th className="py-2 pr-3 text-right font-medium">Transf. (+/−)</th>
                  <th className="py-2 pr-3 text-right font-medium">Devoluções</th>
                  <th className="py-2 pr-3 text-right font-medium">Est. final</th>
                  <th className="py-2 pr-3 text-right font-medium">CMV real</th>
                  <th className="py-2 pr-3 text-right font-medium">Teórico</th>
                  <th className="py-2 pr-3 text-right font-medium">Disp.</th>
                  {editavel ? <th className="py-2 text-right font-medium">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {daSemana.map((c) => {
                  const k = c.contagem;
                  const nome = nomeLoja.get(k.lojaId) ?? "Loja";
                  return (
                    <tr key={k.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 font-medium">
                        {nome}
                        {k.origem === "exemplo" ? <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">EXEMPLO</span> : null}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums" title={c.vendasOrigem === "modulo_vendas" ? "Soma das vendas lançadas no módulo Vendas na semana" : "Informada na contagem"}>
                        {c.vendas != null ? brl(c.vendas) : "—"}
                        {c.vendasOrigem === "modulo_vendas" ? <span className="block text-[10px] text-muted-foreground">do módulo Vendas</span> : null}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{brl(k.estoqueInicial)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{brl(k.compras)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{brl(k.transferenciasEntrada - k.transferenciasSaida)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{brl(k.devolucoes)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{brl(k.estoqueFinal)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {c.pct != null ? pct1(c.pct) : "sem vendas"}
                        <span className="block text-[10px] text-muted-foreground">{brl(c.reais)}</span>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{pct1(c.teorico)}</td>
                      <td className="py-2 pr-3 text-right">{c.dispersao != null ? <StatusPill status={statusDispersao(c.dispersao, tolerancia)}>{sinal(c.dispersao)}</StatusPill> : "—"}</td>
                      {editavel ? (
                        <td className="py-2 text-right">
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Editar contagem de ${nome}`} onClick={() => { setLojaId(k.lojaId); setMsg(null); document.getElementById("cm-loja")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
                            <Pencil aria-hidden />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Excluir contagem de ${nome}`} onClick={() => { setErroExcluir(null); setExcluir(c); }}>
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
        <p className="mt-3 text-xs text-muted-foreground">{REGRA_CMV}</p>
      </SectionCard>

      <ConfirmDialog
        open={excluir != null}
        onOpenChange={(o) => !o && setExcluir(null)}
        title="Excluir contagem?"
        description={excluir ? `${nomeLoja.get(excluir.contagem.lojaId)} · semana de ${ddmm(excluir.contagem.semana)} (CMV ${excluir.pct != null ? pct1(excluir.pct) : brl2(excluir.reais)}). Os itens de dispersão dessa contagem também saem. A exclusão fica registrada no histórico de alterações.` : ""}
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
  lojaId: string;
  nomeLoja: string;
  semana: string;
  registro: CmvSemana | null;
  anterior: CmvSemana | null;
  itensIniciais: CmvItem[];
  vendasModulo: number | null;
  tolerancia: number;
  pendente: boolean;
  aoSalvar: (m: NonNullable<Msg>) => void;
  iniciar: (fn: () => void) => void;
};

function FormularioContagem({ slug, lojaId, nomeLoja, semana, registro, anterior, itensIniciais, vendasModulo, tolerancia, pendente, aoSalvar, iniciar }: FormProps) {
  const sugerido = !registro && anterior != null;
  const [vendas, setVendas] = useState(texto(registro?.vendas));
  const [ei, setEi] = useState(registro ? texto(registro.estoqueInicial) : texto(anterior?.estoqueFinal));
  const [compras, setCompras] = useState(texto(registro?.compras));
  const [trEnt, setTrEnt] = useState(texto(registro?.transferenciasEntrada));
  const [trSai, setTrSai] = useState(texto(registro?.transferenciasSaida));
  const [dev, setDev] = useState(texto(registro?.devolucoes));
  const [ef, setEf] = useState(texto(registro?.estoqueFinal));
  const [teorico, setTeorico] = useState(registro ? texto(registro.cmvTeorico) : texto(anterior?.cmvTeorico));
  const [responsavel, setResponsavel] = useState(registro?.responsavel ?? "");
  const [obs, setObs] = useState(registro?.observacoes ?? "");
  const [itens, setItens] = useState<ItemForm[]>(itensIniciais.map((i) => ({ item: i.item, teorico: texto(i.consumoTeorico), real: texto(i.consumoReal) })));

  const n = (s: string) => lerNumero(s);
  const nz = (s: string) => (s.trim() === "" ? 0 : lerNumero(s));
  const movs = { estoqueInicial: nz(ei), compras: nz(compras), transferenciasEntrada: nz(trEnt), transferenciasSaida: nz(trSai), devolucoes: nz(dev), estoqueFinal: nz(ef) };
  const movsOk = Object.values(movs).every((v) => v != null);
  const reais = movsOk ? cmvReais(movs as Record<keyof typeof movs, number>) : null;
  const vendasInformadas = vendas.trim() === "" ? null : n(vendas);
  const base = vendasInformadas != null && vendasInformadas > 0 ? vendasInformadas : vendasModulo != null && vendasModulo > 0 ? vendasModulo : null;
  const pct = reais != null ? cmvPercentual(reais, base) : null;
  const teoricoN = n(teorico);
  const disp = pct != null && teoricoN != null ? dispersaoPP(pct, teoricoN) : null;

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const num = (s: string, nome: string): number => {
      const v = nz(s);
      if (v == null) throw new Error(`${nome}: use apenas dígitos, vírgula ou ponto.`);
      return v;
    };
    try {
      const entrada = {
        lojaId,
        semana,
        vendas: vendas.trim() === "" ? null : num(vendas, "Vendas da semana"),
        cmvTeorico: num(teorico, "CMV teórico"),
        estoqueInicial: num(ei, "Estoque inicial"),
        compras: num(compras, "Compras"),
        transferenciasEntrada: num(trEnt, "Transferências de entrada"),
        transferenciasSaida: num(trSai, "Transferências de saída"),
        devolucoes: num(dev, "Devoluções"),
        estoqueFinal: num(ef, "Estoque final"),
        responsavel: responsavel.trim() || null,
        observacoes: obs.trim() || null,
        itens: itens
          .filter((i) => i.item.trim() !== "" || i.teorico.trim() !== "" || i.real.trim() !== "")
          .map((i) => ({ item: i.item, consumoTeorico: num(i.teorico, `Consumo teórico de "${i.item || "item"}"`), consumoReal: num(i.real, `Consumo real de "${i.item || "item"}"`) })),
      };
      iniciar(async () => {
        const r = await salvarCmvAction(slug, entrada);
        aoSalvar(r.success ? { tipo: "success", texto: `Contagem de ${nomeLoja} na semana de ${ddmm(semana)} salva.` } : { tipo: "error", texto: r.error });
      });
    } catch (erro) {
      aoSalvar({ tipo: "error", texto: erro instanceof Error ? erro.message : "Confira os números." });
    }
  };

  const mudarItem = (idx: number, campo: keyof ItemForm, valor: string) => setItens((l) => l.map((x, i) => (i === idx ? { ...x, [campo]: valor } : x)));

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="cm-ven">Vendas da semana (R$)</Label>
          <Input id="cm-ven" inputMode="decimal" placeholder={vendasModulo != null ? `vazio = ${brl(vendasModulo)} (módulo Vendas)` : "obrigatório se não há vendas lançadas"} value={vendas} onChange={(e) => setVendas(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cm-ei">Estoque inicial (R$)</Label>
          <Input id="cm-ei" inputMode="decimal" placeholder="0,00" value={ei} onChange={(e) => setEi(e.target.value)} />
          {sugerido && anterior ? <p className="text-[11px] text-muted-foreground">Sugerido: estoque final da semana de {ddmm(anterior.semana)}.</p> : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="cm-co">Compras (R$)</Label>
          <Input id="cm-co" inputMode="decimal" placeholder="0,00" value={compras} onChange={(e) => setCompras(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cm-ef">Estoque final (R$)</Label>
          <Input id="cm-ef" inputMode="decimal" placeholder="0,00" value={ef} onChange={(e) => setEf(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cm-te">Transferências recebidas (R$)</Label>
          <Input id="cm-te" inputMode="decimal" placeholder="0,00" value={trEnt} onChange={(e) => setTrEnt(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cm-ts">Transferências enviadas (R$)</Label>
          <Input id="cm-ts" inputMode="decimal" placeholder="0,00" value={trSai} onChange={(e) => setTrSai(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cm-dv">Devoluções a fornecedor (R$)</Label>
          <Input id="cm-dv" inputMode="decimal" placeholder="0,00" value={dev} onChange={(e) => setDev(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cm-teo">CMV teórico (%)</Label>
          <Input id="cm-teo" inputMode="decimal" placeholder="ex.: 20,4" value={teorico} onChange={(e) => setTeorico(e.target.value)} required />
          {sugerido && anterior ? <p className="text-[11px] text-muted-foreground">Sugerido: o da semana anterior.</p> : null}
        </div>
        <div className="space-y-1 sm:col-span-1 lg:col-span-2">
          <Label htmlFor="cm-resp">Responsável pela contagem (opcional)</Label>
          <Input id="cm-resp" maxLength={120} value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="cm-obs">Observações (opcional)</Label>
          <Input id="cm-obs" maxLength={500} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="ex.: ajuste de inventário classificado em devoluções" />
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 p-3 text-sm tabular-nums" aria-live="polite">
        {reais == null ? (
          <span className="text-muted-foreground">Confira os números para ver a prévia.</span>
        ) : base == null ? (
          <span>
            CMV em reais: <strong>{brl2(reais)}</strong> — informe as vendas da semana (ou lance no módulo Vendas) para ver o percentual.
          </span>
        ) : (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              CMV real: <strong>{pct1(pct ?? 0)}</strong> ({brl2(reais)} sobre {brl(base)}
              {vendasInformadas == null ? ", vendas do módulo Vendas" : ""})
            </span>
            {disp != null ? (
              <span className="inline-flex items-center gap-1.5">
                dispersão <StatusPill status={statusDispersao(disp, tolerancia)}>{sinal(disp)} p.p.</StatusPill>
              </span>
            ) : null}
          </span>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Dispersão por item (opcional)</legend>
        <p className="text-xs text-muted-foreground">Consumo teórico (pela ficha técnica) e consumo real dos itens que você quer acompanhar. Até +2% fica verde, até +5% amarelo, acima vermelho.</p>
        {itens.length > 0 ? (
          <div className="space-y-2">
            {itens.map((i, idx) => {
              const d = desvioItemPct(lerNumero(i.teorico) ?? 0, lerNumero(i.real) ?? 0);
              return (
                <div key={idx} className="grid grid-cols-[minmax(0,1fr)_6rem_6rem_auto] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_5rem_auto]">
                  <div className="space-y-1">
                    <Label htmlFor={`cm-i-${idx}`} className="text-xs">Item</Label>
                    <Input id={`cm-i-${idx}`} maxLength={120} value={i.item} onChange={(e) => mudarItem(idx, "item", e.target.value)} placeholder="ex.: Salmão" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`cm-it-${idx}`} className="text-xs">Teórico</Label>
                    <Input id={`cm-it-${idx}`} inputMode="decimal" value={i.teorico} onChange={(e) => mudarItem(idx, "teorico", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`cm-ir-${idx}`} className="text-xs">Real</Label>
                    <Input id={`cm-ir-${idx}`} inputMode="decimal" value={i.real} onChange={(e) => mudarItem(idx, "real", e.target.value)} />
                  </div>
                  <div className="hidden pb-2 text-right sm:block">{d != null ? <StatusPill status={statusItem(d)}>{sinal(d)}%</StatusPill> : null}</div>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remover item ${i.item || idx + 1}`} onClick={() => setItens((l) => l.filter((_, x) => x !== idx))}>
                    <X aria-hidden />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={() => setItens((l) => [...l, { item: "", teorico: "", real: "" }])} disabled={itens.length >= 60}>
          <Plus aria-hidden /> Adicionar item
        </Button>
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : registro ? "Atualizar contagem" : "Salvar contagem"}
        </Button>
      </div>
    </form>
  );
}
