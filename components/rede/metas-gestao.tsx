"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SectionCard } from "@/components/ui/section-card";
import { definirMetaAction, definirMetaFaturamentoAction, salvarIndicadorMesAction } from "@/lib/rede/actions";
import { brl, resolverMeta, textoMeta } from "@/lib/rede/calculo";
import { lerNumero } from "@/lib/rede/csv";
import { FONTE_CALCULADA, FONTE_CALCULADA_CURTA } from "@/lib/rede/delivery";
import { INDICADORES, type IndicadorKey, type IndicadorMes, type Loja, type MetaFaturamento, type MetaRow } from "@/lib/rede/tipos";

type Msg = { tipo: "success" | "error"; texto: string } | null;
const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const paraTexto = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

/* ============================================================ metas dos indicadores */

type LinhaProps = {
  slug: string;
  lojaId: string | null;
  indicador: IndicadorKey;
  vigente: MetaRow | null;
  herdada: MetaRow | null;
  editavel: boolean;
  hoje: string;
  aoSalvar: (m: Msg) => void;
};

function LinhaMeta({ slug, lojaId, indicador, vigente, herdada, editavel, hoje, aoSalvar }: LinhaProps) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const def = INDICADORES.find((i) => i.k === indicador)!;
  const inicial = vigente ?? (lojaId ? null : herdada);
  const [meta, setMeta] = useState(paraTexto(inicial?.meta));
  const [direcao, setDirecao] = useState<"min" | "max" | "none">(inicial?.direcao ?? "none");
  const [vigencia, setVigencia] = useState(hoje);
  const alterou = meta !== paraTexto(inicial?.meta) || direcao !== (inicial?.direcao ?? "none");

  const salvar = () => {
    const n = direcao === "none" ? null : lerNumero(meta);
    if (direcao !== "none" && n == null) {
      aoSalvar({ tipo: "error", texto: `${def.nome}: informe o valor da meta.` });
      return;
    }
    iniciar(async () => {
      const r = await definirMetaAction(slug, { lojaId, indicador, meta: n, direcao: direcao === "none" ? null : direcao, vigencia });
      if (r.success) {
        aoSalvar({ tipo: "success", texto: `${def.nome}: meta salva a partir de ${br(vigencia)}. A meta anterior continua valendo no histórico.` });
        router.refresh();
      } else aoSalvar({ tipo: "error", texto: `${def.nome}: ${r.error}` });
    });
  };

  return (
    <tr className="border-b border-border/60 last:border-0 align-top">
      <td className="py-2 pr-3">
        <span className="font-medium">{def.nome}</span>
        <span className="block text-xs text-muted-foreground">
          {def.k === "fat" ? "piso mensal por loja (R$)" : def.frequencia.toLowerCase()}
          {lojaId && !vigente && herdada ? ` · usa a da rede: ${textoMeta(def.formato, herdada.meta, herdada.direcao)}` : ""}
        </span>
      </td>
      <td className="py-2 pr-2">
        <NativeSelect aria-label={`Tipo de meta — ${def.nome}`} value={direcao} disabled={!editavel} onChange={(e) => setDirecao(e.target.value as "min" | "max" | "none")} className="min-w-36">
          <option value="min">pelo menos</option>
          <option value="max">no máximo</option>
          <option value="none">só acompanhar</option>
        </NativeSelect>
      </td>
      <td className="py-2 pr-2">
        <Input aria-label={`Valor da meta — ${def.nome}`} inputMode="decimal" className="w-28" value={direcao === "none" ? "" : meta} disabled={!editavel || direcao === "none"} onChange={(e) => setMeta(e.target.value)} placeholder={direcao === "none" ? "—" : "0"} />
      </td>
      {editavel ? (
        <>
          <td className="py-2 pr-2">
            <Input aria-label={`Vigência — ${def.nome}`} type="date" className="w-40" value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
          </td>
          <td className="py-2 text-right">
            <Button type="button" size="sm" disabled={pendente || !alterou} onClick={salvar}>
              {pendente ? "Salvando…" : "Salvar"}
            </Button>
          </td>
        </>
      ) : null}
    </tr>
  );
}

export function MetasIndicadores({ slug, lojas, metas, editaRede, lojasEditaveis, hoje }: { slug: string; lojas: Loja[]; metas: MetaRow[]; editaRede: boolean; lojasEditaveis: string[]; hoje: string }) {
  const [escopo, setEscopo] = useState<string>("rede");
  const [msg, setMsg] = useState<Msg>(null);
  const lojaId = escopo === "rede" ? null : escopo;
  const editavel = lojaId ? lojasEditaveis.includes(lojaId) : editaRede;

  const linhas = useMemo(
    () =>
      INDICADORES.map((d) => ({
        d,
        vigente: metas.find((m) => m.lojaId === lojaId && m.indicador === d.k && m.validoAte == null) ?? null,
        herdada: metas.find((m) => m.lojaId === null && m.indicador === d.k && m.validoAte == null) ?? null,
        historico: metas.filter((m) => m.indicador === d.k && (lojaId ? m.lojaId === lojaId : m.lojaId === null)).sort((a, b) => b.validoDe.localeCompare(a.validoDe)),
      })),
    [metas, lojaId],
  );

  return (
    <SectionCard title="Metas dos indicadores" description="Cada alteração vale a partir da data de vigência; a meta anterior fica guardada no histórico e continua valendo para os meses passados.">
      <div className="space-y-4">
        <div className="max-w-xs space-y-1">
          <Label htmlFor="m-escopo">Metas de</Label>
          <NativeSelect id="m-escopo" value={escopo} onChange={(e) => { setEscopo(e.target.value); setMsg(null); }}>
            <option value="rede">Padrão da rede (vale para todas as lojas)</option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                Só {l.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}
        {!editavel ? <FeedbackMessage variant="info">Seu perfil pode consultar estas metas, mas não alterá-las{lojaId ? " nesta loja" : ""}.</FeedbackMessage> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Indicador</th>
                <th className="py-2 pr-2 font-medium">Tipo</th>
                <th className="py-2 pr-2 font-medium">Meta</th>
                {editavel ? (
                  <>
                    <th className="py-2 pr-2 font-medium">Vale a partir de</th>
                    <th className="py-2" />
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ d, vigente, herdada }) => (
                <LinhaMeta key={`${escopo}-${d.k}-${vigente?.id ?? "x"}-${herdada?.id ?? "x"}`} slug={slug} lojaId={lojaId} indicador={d.k} vigente={vigente} herdada={herdada} editavel={editavel} hoje={hoje} aoSalvar={setMsg} />
              ))}
            </tbody>
          </table>
        </div>
        <details className="rounded-lg border border-border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Histórico de metas {lojaId ? "desta loja" : "da rede"}</summary>
          <div className="mt-3 space-y-3">
            {linhas.every((l) => l.historico.length === 0) ? <p className="text-muted-foreground">Nenhuma meta cadastrada neste escopo.</p> : null}
            {linhas
              .filter((l) => l.historico.length > 0)
              .map(({ d, historico }) => (
                <div key={d.k}>
                  <p className="font-medium">{d.nome}</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {historico.map((h) => (
                      <li key={h.id} className="tabular-nums">
                        {br(h.validoDe)} → {h.validoAte ? br(h.validoAte) : "em vigor"}: {textoMeta(d.formato, h.meta, h.direcao)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </details>
      </div>
    </SectionCard>
  );
}

/* ============================================================ metas de faturamento por mês */

const UNIDADE = { brl: "em reais", pct0: "em %", pct1: "em %", pctS: "variação em %", min: "em minutos", nota: "nota (0 a 5)", int: "quantidade" } as const;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function CelulaMetaFat({ slug, lojaId, mes, valor, editavel, aoSalvar }: { slug: string; lojaId: string; mes: string; valor: number | null; editavel: boolean; aoSalvar: (m: Msg) => void }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [texto, setTexto] = useState(paraTexto(valor));
  const salvar = () => {
    if (texto === paraTexto(valor)) return;
    const n = texto.trim() === "" ? null : lerNumero(texto);
    if (texto.trim() !== "" && n == null) {
      aoSalvar({ tipo: "error", texto: "Meta de faturamento: use apenas números." });
      return;
    }
    iniciar(async () => {
      const r = await definirMetaFaturamentoAction(slug, { lojaId, mes, valor: n });
      if (r.success) {
        aoSalvar({ tipo: "success", texto: "Meta de faturamento salva." });
        router.refresh();
      } else aoSalvar({ tipo: "error", texto: r.error });
    });
  };
  return (
    <Input
      aria-label={`Meta de faturamento ${mes}`}
      inputMode="decimal"
      className="h-8 w-28 text-right tabular-nums"
      value={texto}
      disabled={!editavel || pendente}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={salvar}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      placeholder="—"
    />
  );
}

export function MetasFaturamento({ slug, lojas, metasFat, ano, lojasEditaveis }: { slug: string; lojas: Loja[]; metasFat: MetaFaturamento[]; ano: string; lojasEditaveis: string[] }) {
  const [msg, setMsg] = useState<Msg>(null);
  const meses = MESES.map((_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`);
  const valor = (lojaId: string, mes: string) => metasFat.find((m) => m.lojaId === lojaId && m.mes === `${mes}-01`)?.valor ?? null;
  return (
    <SectionCard title={`Meta de faturamento por loja — ${ano}`} description="Meta do mês de cada loja (base do % da meta, da meta diária e do acumulado). Deixe em branco para remover. A meta do dia segue o peso de cada dia da semana.">
      <div className="space-y-3">
        {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 pr-3 text-left font-medium">Loja</th>
                {MESES.map((m) => (
                  <th key={m} className="px-1 py-2 text-right font-medium capitalize">
                    {m}
                  </th>
                ))}
                <th className="py-2 pl-2 text-right font-medium">Ano</th>
              </tr>
            </thead>
            <tbody>
              {lojas.map((l) => (
                <tr key={l.id} className="border-b border-border/60 last:border-0">
                  <td className="py-1.5 pr-3 font-medium">{l.nome}</td>
                  {meses.map((m) => (
                    <td key={m} className="px-1 py-1.5">
                      <CelulaMetaFat key={`${m}-${valor(l.id, m) ?? "x"}`} slug={slug} lojaId={l.id} mes={m} valor={valor(l.id, m)} editavel={lojasEditaveis.includes(l.id)} aoSalvar={setMsg} />
                    </td>
                  ))}
                  <td className="py-1.5 pl-2 text-right text-xs tabular-nums text-muted-foreground">{brl(meses.reduce((a, m) => a + (valor(l.id, m) ?? 0), 0))}</td>
                </tr>
              ))}
              <tr className="font-medium">
                <td className="py-2 pr-3">Rede</td>
                {meses.map((m) => (
                  <td key={m} className="px-1 py-2 text-right text-xs tabular-nums">
                    {brl(lojas.reduce((a, l) => a + (valor(l.id, m) ?? 0), 0))}
                  </td>
                ))}
                <td className="py-2 pl-2 text-right text-xs tabular-nums">{brl(lojas.reduce((a, l) => a + meses.reduce((b, m) => b + (valor(l.id, m) ?? 0), 0), 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}

/* ============================================================ indicadores do mês */

function CelulaIndicador({ slug, lojaId, mes, indicador, lancado, editavel, aoSalvar }: { slug: string; lojaId: string; mes: string; indicador: IndicadorKey; lancado: IndicadorMes | null; editavel: boolean; aoSalvar: (m: Msg) => void }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [texto, setTexto] = useState(paraTexto(lancado?.valor));
  const salvar = () => {
    if (texto === paraTexto(lancado?.valor)) return;
    const n = texto.trim() === "" ? null : lerNumero(texto);
    if (texto.trim() !== "" && n == null) {
      aoSalvar({ tipo: "error", texto: "Indicador: use apenas números." });
      return;
    }
    iniciar(async () => {
      const r = await salvarIndicadorMesAction(slug, { lojaId, mes, indicador, valor: n });
      if (r.success) {
        aoSalvar({ tipo: "success", texto: "Indicador salvo." });
        router.refresh();
      } else aoSalvar({ tipo: "error", texto: r.error });
    });
  };
  return (
    <div className="flex flex-col items-end gap-0.5">
      <Input
        aria-label={`${indicador} ${lojaId}`}
        inputMode="decimal"
        className="h-8 w-24 text-right tabular-nums"
        value={texto}
        disabled={!editavel || pendente}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={salvar}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        placeholder="—"
      />
      {lancado?.origem === "exemplo" ? <span className="text-[10px] text-amber-600 dark:text-amber-400">exemplo</span> : null}
    </div>
  );
}

export function IndicadoresDoMes({ slug, lojas, metas, indicadores, calculados, mes, lojasEditaveis }: { slug: string; lojas: Loja[]; metas: MetaRow[]; indicadores: IndicadorMes[]; calculados: IndicadorMes[]; mes: string; lojasEditaveis: string[] }) {
  const [msg, setMsg] = useState<Msg>(null);
  const manuais = INDICADORES.filter((d) => !d.calculado);
  const ref = `${mes}-01`;
  return (
    <SectionCard title={`Indicadores lançados — ${MESES[Number(mes.slice(5, 7)) - 1]}/${mes.slice(0, 4)}`} description="Faturamento e % da meta são calculados das vendas. Vêm de outros módulos quando eles têm dados no mês: o CMV das contagens semanais, as rupturas da cozinha central, preparo, cancelamentos, nota iFood e tempo online dos checklists de delivery (média do mês) e o turnover e o absenteísmo do lançamento mensal de RH. Os demais são lançados aqui, por loja.">
      <div className="space-y-3">
        {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Indicador</th>
                <th className="py-2 pr-3 font-medium">Meta</th>
                {lojas.map((l) => (
                  <th key={l.id} className="px-1 py-2 text-right font-medium">
                    {l.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {manuais.map((d) => {
                const m = resolverMeta(metas, null, d.k, ref);
                return (
                  <tr key={d.k} className="border-b border-border/60 last:border-0">
                    <td className="py-1.5 pr-3">
                      <span className="font-medium">{d.nome}</span>
                      <span className="block text-xs text-muted-foreground">{UNIDADE[d.formato]}</span>
                    </td>
                    <td className="py-1.5 pr-3 text-xs text-muted-foreground">{textoMeta(d.formato, m.meta, m.direcao)}</td>
                    {lojas.map((l) => {
                      const lanc = indicadores.find((i) => i.lojaId === l.id && i.indicador === d.k && i.mes === ref) ?? null;
                      const calculado = FONTE_CALCULADA[d.k] ? (calculados.find((i) => i.lojaId === l.id && i.indicador === d.k && i.mes === ref) ?? null) : null;
                      if (calculado) {
                        return (
                          <td key={l.id} className="px-1 py-1.5">
                            <div className="flex flex-col items-end gap-0.5" title={`O valor do mês é calculado ${FONTE_CALCULADA[d.k] ?? "de outro módulo"} e substitui o valor lançado à mão.`}>
                              <span className="inline-flex h-8 w-24 items-center justify-end rounded-lg border border-border bg-muted/50 px-3 text-sm tabular-nums">{String(Math.round(calculado.valor * 10) / 10).replace(".", ",")}</span>
                              <span className="text-[10px] text-muted-foreground">{FONTE_CALCULADA_CURTA[d.k] ?? "calculado"}</span>
                            </div>
                          </td>
                        );
                      }
                      return (
                        <td key={l.id} className="px-1 py-1.5">
                          <CelulaIndicador key={`${l.id}-${lanc?.valor ?? "x"}-${lanc?.origem ?? ""}`} slug={slug} lojaId={l.id} mes={mes} indicador={d.k} lancado={lanc} editavel={lojasEditaveis.includes(l.id)} aoSalvar={setMsg} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}
