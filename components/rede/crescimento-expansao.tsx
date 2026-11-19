import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";
import { brl, brlCompacto } from "@/lib/rede/calculo";
import type { DadosPainel } from "@/lib/rede/loader";

const NOMES_MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const mesPorExtenso = (mes: string | null) => (mes ? `${NOMES_MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}` : "Sem data definida");
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "Crescimento e expansão" da visão geral: rede hoje × projeção com N lojas no faturamento mínimo (painel original). */
export function CrescimentoExpansao({ p, rotuloRef, parcial, verOrcamento, slug }: { p: NonNullable<DadosPainel["projecao"]>; rotuloRef: string; parcial: boolean; verOrcamento: boolean; slug: string }) {
  const novasTxt = p.qtdNovas > 0 ? `${p.qtdNovas} ${p.qtdNovas === 1 ? "loja" : "lojas"} acima de ${brlCompacto(p.faturamentoMinimo)} (${brl(p.qtdNovas * p.faturamentoMinimo)})` : "nenhuma loja nova";
  const baseTxt = p.base.length > 0 ? p.base.map((b) => `${b.nome} (${brl(b.fat)})`).join(" + ") : "lojas-base sem vendas no mês";
  return (
    <SectionCard title="Crescimento e expansão" description={`Projeção com ${p.metaLojas} lojas, em faturamento mensal mínimo. Mês de referência: ${rotuloRef}${parcial ? " (em andamento — compare com cautela)" : ""}.`}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Rede hoje ({p.lojasOperando} {p.lojasOperando === 1 ? "loja" : "lojas"} em operação)
            </p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{brlCompacto(p.fatRede)}</p>
            <p className="text-xs text-muted-foreground">por mês</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground">Projeção com {p.metaLojas} lojas</p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{brlCompacto(p.projecao)}</p>
            <p className="text-xs text-muted-foreground">por mês, no mínimo</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {baseTxt} + {novasTxt} = <strong className="text-foreground tabular-nums">{brl(p.projecao)}</strong> por mês
          {p.vezes != null ? ` — ${nf1.format(p.vezes)}x o faturamento de hoje` : ""}.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {p.proximas.length > 0 ? (
            p.proximas.map((u) => (
              <div key={`${u.nome}-${u.mes}`} className="rounded-xl border border-border p-3">
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{mesPorExtenso(u.mes)}</p>
                <p className="text-sm">Abertura: {u.nome}.</p>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground sm:col-span-3">Nenhuma inauguração planejada no calendário.</div>
          )}
          <div className="rounded-xl border border-border p-3 sm:col-span-3">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Meta da rede</p>
            <p className="text-sm">
              No mínimo {p.metaLojas} lojas ({p.qtdNovas > 0 ? `${p.qtdNovas} ${p.qtdNovas === 1 ? "nova" : "novas"} além das lojas-base` : "meta já atingida pelas lojas-base"}).{" "}
              {verOrcamento ? (
                <Link href={`/${slug}/rede/orcamento`} className="underline underline-offset-2">
                  Ver orçamento e calendário
                </Link>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
