"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { StatusPill } from "@/components/rede/status";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/ui/section-card";
import { ajustarEstoqueAction, excluirProdutoAction, salvarProdutoAction } from "@/lib/rede/actions-cozinha";
import { brl, brl2 } from "@/lib/rede/calculo";
import { DIAS_DE_REPOSICAO, type LinhaEstoque } from "@/lib/rede/cozinha";
import { lerNumero } from "@/lib/rede/csv";
import { linhasCsvEstoque } from "@/lib/rede/delivery";
import type { ProdutoCC } from "@/lib/rede/tipos";

type Msg = { tipo: "success" | "error"; texto: string } | null;

const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nfLivre = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
const texto = (n: number) => String(n).replace(".", ",");

type Props = {
  slug: string;
  linhas: LinhaEstoque[];
  /** Rupturas de cada produto nas semanas mostradas (id → quantidade); null = o perfil não vê rupturas. */
  rupturas: Record<string, number> | null;
  semanasRupturas: number;
  editavel: boolean;
};

export function CozinhaEstoque({ slug, linhas, rupturas, semanasRupturas, editavel }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [editando, setEditando] = useState<ProdutoCC | null>(null);
  const [excluir, setExcluir] = useState<ProdutoCC | null>(null);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  /** Salva um número da tabela quando o campo perde o foco e o valor mudou. */
  const ajustar = (p: ProdutoCC, campo: "atual" | "minimo" | "consumoDia", bruto: string) => {
    const atual = p[campo];
    const n = bruto.trim() === "" ? null : lerNumero(bruto);
    if (n == null) {
      setMsg({ tipo: "error", texto: `${p.item}: use apenas dígitos, vírgula ou ponto.` });
      router.refresh();
      return;
    }
    if (n === atual) return;
    iniciar(async () => {
      const r = await ajustarEstoqueAction(slug, { id: p.id, [campo]: n });
      setMsg(r.success ? { tipo: "success", texto: `${p.item} atualizado.` } : { tipo: "error", texto: r.error });
      router.refresh();
    });
  };

  const confirmarExclusao = () => {
    if (!excluir) return;
    setErroExcluir(null);
    iniciar(async () => {
      const r = await excluirProdutoAction(slug, excluir.id);
      if (r.success) {
        setExcluir(null);
        if (editando?.id === excluir.id) setEditando(null);
        setMsg({ tipo: "success", texto: "Item excluído do estoque." });
        router.refresh();
      } else setErroExcluir(r.error);
    });
  };

  const campoNumero = (p: ProdutoCC, campo: "atual" | "minimo" | "consumoDia", passo: string, rotulo: string) =>
    editavel ? (
      <Input
        key={`${p.id}-${campo}-${p[campo]}`}
        type="number"
        min={0}
        step={passo}
        inputMode="decimal"
        aria-label={`${rotulo} de ${p.item}`}
        defaultValue={p[campo]}
        onBlur={(e) => ajustar(p, campo, e.target.value)}
        disabled={pendente}
        className="h-8 w-24 text-right tabular-nums"
      />
    ) : (
      <span className="tabular-nums">{nfLivre.format(p[campo])}</span>
    );

  return (
    <div className="space-y-5">
      {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}

      <SectionCard
        title="Estoque da cozinha central"
        description={`${editavel ? "Edite atual, mínimo e consumo direto na tabela. " : ""}"Repor" cobre ${DIAS_DE_REPOSICAO} dias de consumo acima do mínimo. Crítico = abaixo do mínimo; atenção = perto do mínimo ou menos de 3 dias de cobertura.`}
      >
        <div className="mb-3">
          <AcoesExportar arquivo="estoque-cozinha-central-fat-buddha.csv" linhas={linhasCsvEstoque(linhas)} />
        </div>
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item cadastrado no estoque da cozinha central.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Item</th>
                  <th className="py-2 pr-3 font-medium">Un.</th>
                  <th className="py-2 pr-3 text-right font-medium">Estoque atual</th>
                  <th className="py-2 pr-3 text-right font-medium">Mínimo</th>
                  <th className="py-2 pr-3 text-right font-medium">Consumo/dia</th>
                  <th className="py-2 pr-3 text-right font-medium">Cobertura</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 text-right font-medium">Repor</th>
                  {rupturas ? <th className="py-2 pr-3 text-right font-medium" title={`Rupturas do item nas últimas ${semanasRupturas} semanas com ruptura registrada`}>Rupturas</th> : null}
                  <th className="py-2 pr-3 text-right font-medium">Custo unit.</th>
                  <th className="py-2 pr-3 text-right font-medium">Valor</th>
                  {editavel ? <th className="py-2 text-right font-medium">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const p = l.produto;
                  return (
                    <tr key={p.id} className="border-b border-border/60 last:border-0">
                      <td className="py-1.5 pr-3 font-medium">
                        {p.item}
                        {p.origem === "exemplo" ? <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">EXEMPLO</span> : null}
                      </td>
                      <td className="py-1.5 pr-3">{p.unidade}</td>
                      <td className="py-1.5 pr-3 text-right">{campoNumero(p, "atual", "any", "Estoque atual")}</td>
                      <td className="py-1.5 pr-3 text-right">{campoNumero(p, "minimo", "any", "Mínimo")}</td>
                      <td className="py-1.5 pr-3 text-right">{campoNumero(p, "consumoDia", "any", "Consumo por dia")}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{l.cobertura == null ? "—" : `${nf1.format(l.cobertura)} dias`}</td>
                      <td className="py-1.5 pr-3">
                        <StatusPill status={l.status.tom}>{l.status.rotulo}</StatusPill>
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{l.reposicao > 0 ? <strong>{`${nf0.format(l.reposicao)} ${p.unidade}`}</strong> : <span className="text-muted-foreground">—</span>}</td>
                      {rupturas ? <td className="py-1.5 pr-3 text-right tabular-nums">{rupturas[p.id] ? <StatusPill status="bad">{rupturas[p.id]}</StatusPill> : <span className="text-muted-foreground">—</span>}</td> : null}
                      <td className="py-1.5 pr-3 text-right tabular-nums">{brl2(p.custo)}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{brl(l.valor)}</td>
                      {editavel ? (
                        <td className="py-1 text-right whitespace-nowrap">
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Editar o item ${p.item}`} onClick={() => { setMsg(null); setEditando(p); document.getElementById("es-nome")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
                            <Pencil aria-hidden />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Excluir o item ${p.item}`} onClick={() => { setErroExcluir(null); setExcluir(p); }}>
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

      {editavel ? (
        <SectionCard title={editando ? `Editar item — ${editando.item}` : "Novo item"} description="O nome do item não se repete no estoque. O mesmo nome é usado para somar as rupturas do item.">
          <FormularioProduto
            key={editando?.id ?? "novo"}
            slug={slug}
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
        <FeedbackMessage variant="info">Seu perfil pode consultar o estoque da cozinha central, mas não alterá-lo.</FeedbackMessage>
      )}

      <ConfirmDialog
        open={excluir != null}
        onOpenChange={(o) => !o && setExcluir(null)}
        title="Excluir este item do estoque?"
        description={excluir ? `${excluir.item}. As rupturas já registradas desse item continuam no histórico. A exclusão fica registrada no histórico de alterações.` : ""}
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
  editando: ProdutoCC | null;
  pendente: boolean;
  iniciar: (fn: () => void) => void;
  aoSalvar: (m: NonNullable<Msg>) => void;
  aoCancelar: () => void;
};

function FormularioProduto({ slug, editando, pendente, iniciar, aoSalvar, aoCancelar }: FormProps) {
  const [item, setItem] = useState(editando?.item ?? "");
  const [unidade, setUnidade] = useState(editando?.unidade ?? "");
  const [atual, setAtual] = useState(editando ? texto(editando.atual) : "");
  const [minimo, setMinimo] = useState(editando ? texto(editando.minimo) : "");
  const [consumo, setConsumo] = useState(editando ? texto(editando.consumoDia) : "");
  const [custo, setCusto] = useState(editando ? texto(editando.custo) : "");

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const num = (s: string, nome: string): number | null => {
      if (s.trim() === "") return 0;
      const v = lerNumero(s);
      if (v == null) {
        aoSalvar({ tipo: "error", texto: `${nome}: use apenas dígitos, vírgula ou ponto.` });
        return null;
      }
      return v;
    };
    const a = num(atual, "Estoque atual");
    const m = num(minimo, "Mínimo");
    const c = num(consumo, "Consumo por dia");
    const u = num(custo, "Custo unitário");
    if (a == null || m == null || c == null || u == null) return;
    iniciar(async () => {
      const r = await salvarProdutoAction(slug, { id: editando?.id, item, unidade: unidade.trim() || "un", atual: a, minimo: m, consumoDia: c, custo: u });
      if (r.success) {
        if (!editando) {
          setItem("");
          setUnidade("");
          setAtual("");
          setMinimo("");
          setConsumo("");
          setCusto("");
        }
        aoSalvar({ tipo: "success", texto: editando ? "Item atualizado." : "Item adicionado." });
      } else aoSalvar({ tipo: "error", texto: r.error });
    });
  };

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="es-nome">Item</Label>
          <Input id="es-nome" maxLength={120} placeholder="Nome do item" value={item} onChange={(e) => setItem(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="es-un">Unidade</Label>
          <Input id="es-un" maxLength={12} placeholder="kg, L, un" value={unidade} onChange={(e) => setUnidade(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="es-at">Estoque atual</Label>
          <Input id="es-at" inputMode="decimal" value={atual} onChange={(e) => setAtual(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="es-min">Mínimo</Label>
          <Input id="es-min" inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="es-cons">Consumo/dia</Label>
          <Input id="es-cons" inputMode="decimal" value={consumo} onChange={(e) => setConsumo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="es-cu">Custo unitário (R$)</Label>
          <Input id="es-cu" inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : editando ? "Salvar alterações" : "Adicionar"}
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
