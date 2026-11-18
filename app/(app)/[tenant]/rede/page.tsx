import Link from "next/link";
import { CalendarClock, LayoutGrid } from "lucide-react";

import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { FiltrosRedeBarra } from "@/components/rede/filtros-rede";
import { GraficosPainel } from "@/components/rede/graficos-painel";
import { KpiCard } from "@/components/rede/kpi-card";
import { AlertasRede, RankingLojas } from "@/components/rede/ranking-alertas";
import { TabelaIndicadores } from "@/components/rede/tabela-indicadores";
import { EmptyState } from "@/components/ui/empty-state";
import { exigirModulo } from "@/lib/rede/acesso";
import { brl2, brlCompacto, inteiro, pct1 } from "@/lib/rede/calculo";
import { rotuloPeriodo } from "@/lib/rede/filtros";
import { carregarPainel } from "@/lib/rede/loader";
import { podeEditar } from "@/lib/rede/permissoes";
import { INDICADORES } from "@/lib/rede/tipos";

export const metadata = { title: "Rede de lojas — Visão geral" };

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default async function RedeVisaoGeralPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tenant: slug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await exigirModulo(slug, "dashboard");
  const d = await carregarPainel(ctx, sp);
  const { painel, filtros, base } = d;
  const k = painel.kpis;
  const rotuloRef = rotuloPeriodo({ modo: "mes", mes: painel.mesRef, ano: "", de: "", ate: "" });
  const rotuloPer = rotuloPeriodo(filtros);
  const filtroLoja = d.lojaFiltro?.nome ?? "Rede toda";
  const emInauguracao = base.lojas.filter((l) => l.status === "inauguracao");
  const tomMeta = k.pctMeta == null ? "neutro" : k.pctMeta >= 100 ? "ok" : k.pctMeta >= 90 ? "atencao" : "critico";

  const lojasLista = base.lojas.filter((l) => l.status !== "inativa").map((l) => ({ slug: l.slug, nome: l.nome }));

  if (base.lojas.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="Nenhuma loja cadastrada"
        description="Cadastre as lojas da rede para começar a lançar vendas e acompanhar as metas."
        action={podeEditar(ctx.perfil, "config") ? { label: "Cadastrar lojas", href: `/${slug}/rede/lojas` } : undefined}
      />
    );
  }

  const linhasExport: (string | number | null)[][] = [
    ["Loja", "Período", "Faturamento", "Salão", "Delivery", "Pedidos", "Ticket médio", "% delivery", `Meta do mês (${rotuloRef})`, `% da meta (${rotuloRef})`, "Indicadores na meta", "Indicadores com meta", ...INDICADORES.map((i) => i.nome)],
    ...painel.porLoja
      .filter((p) => !d.lojaFiltro || p.loja.id === d.lojaFiltro.id)
      .map((p) => {
        const rk = painel.ranking.find((r) => r.lojaId === p.loja.id);
        return [
          p.loja.nome,
          rotuloPer,
          Math.round(p.periodo.fat * 100) / 100,
          p.periodo.salao,
          p.periodo.delivery,
          p.periodo.pedidos,
          p.periodo.ticket == null ? null : Math.round(p.periodo.ticket * 100) / 100,
          p.periodo.pctDelivery == null ? null : Math.round(p.periodo.pctDelivery * 10) / 10,
          p.mes.metaMes,
          p.mes.pctMeta == null ? null : Math.round(p.mes.pctMeta * 10) / 10,
          rk?.ok ?? 0,
          rk?.comMeta ?? 0,
          ...INDICADORES.map((i) => p.avaliacoes.find((a) => a.k === i.k)?.valor ?? null),
        ];
      }),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <FiltrosRedeBarra basePath={`/${slug}/rede`} filtros={filtros} lojas={lojasLista} />
        </div>
        <AcoesExportar arquivo={`rede-${slug}-${filtros.modo === "mes" ? filtros.mes : filtros.modo === "ano" ? filtros.ano : `${filtros.de}_${filtros.ate}`}.csv`} linhas={linhasExport} />
      </div>

      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">{filtroLoja}</strong> · período {rotuloPer}. Ranking, alertas e a tabela de metas usam o mês de referência <strong className="text-foreground">{rotuloRef}</strong>
        {painel.corte.parcial && painel.corte.dataCorte ? ` (mês em andamento: comparação até ${ddmm(painel.corte.dataCorte)})` : ""}.
      </p>

      {painel.lojasSemLancamento.length > 0 ? (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <strong>Vendas sem lançamento:</strong> {painel.lojasSemLancamento.map((l) => `${l.nome} (${l.dias} ${l.dias === 1 ? "dia" : "dias"})`).join(" · ")}.{" "}
            {podeEditar(ctx.perfil, "vendas") ? (
              <Link href={`/${slug}/rede/vendas`} className="underline underline-offset-2">
                Lançar agora
              </Link>
            ) : null}
          </p>
        </div>
      ) : null}

      {!d.temVendas ? (
        <EmptyState
          icon={LayoutGrid}
          title="Nenhuma venda neste período"
          description="Lance as vendas do dia ou importe um arquivo CSV para ver o faturamento, as metas e os indicadores."
          action={podeEditar(ctx.perfil, "vendas") ? { label: "Lançar vendas", href: `/${slug}/rede/vendas` } : undefined}
        />
      ) : (
        <>
          <section aria-label="Indicadores principais" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard rotulo="Faturamento" valor={brlCompacto(k.fat)} detalhe={k.meta != null ? `meta do período ${brlCompacto(k.meta)}` : "sem meta de faturamento cadastrada"} progresso={k.pctMeta} tom={tomMeta} />
            <KpiCard rotulo="Vendas × meta" valor={k.pctMeta == null ? "—" : pct1(k.pctMeta)} detalhe={k.pctMeta == null ? "cadastre a meta do mês em Metas e indicadores" : "no período"} progresso={k.pctMeta} tom={tomMeta} />
            <KpiCard rotulo="Pedidos" valor={inteiro(k.pedidos)} detalhe="salão + delivery" />
            <KpiCard rotulo="Ticket médio" valor={k.ticket == null ? "—" : brl2(k.ticket)} detalhe="por pedido" />
            <KpiCard rotulo="Delivery no faturamento" valor={k.pctDelivery == null ? "—" : pct1(k.pctDelivery)} detalhe={`${brlCompacto(k.delivery)} no período`} progresso={k.pctDelivery} />
            <KpiCard
              rotulo={`Lojas acima de ${brlCompacto(base.config.pisoLoja)}`}
              valor={`${k.lojasAcimaPiso} de ${k.lojasOperando}`}
              detalhe={emInauguracao.length > 0 ? `${emInauguracao.map((l) => `${l.nome} abre ${l.inauguracaoPrevista ?? "em breve"}`).join(" · ")}` : "no mês de referência"}
              progresso={k.lojasOperando > 0 ? (k.lojasAcimaPiso / k.lojasOperando) * 100 : null}
            />
          </section>

          <GraficosPainel
            dados={{
              lojas: painel.porLoja.map((p) => ({ nome: p.loja.nome, fat: p.mes.totais.fat, metaMes: p.mes.metaMes, piso: base.config.pisoLoja * (painel.corte.parcial ? painel.corte.fracao : 1) })),
              rotuloMesRef: rotuloRef,
              serie: painel.serie,
              canais: { salao: k.salao, delivery: k.delivery },
              horas: d.horas.pontos,
              picoHora: d.horas.pico?.hora ?? null,
              temMetaSerie: k.meta != null,
            }}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <RankingLojas linhas={painel.ranking} />
            <AlertasRede alertas={painel.alertas} />
          </div>

          <TabelaIndicadores porLoja={painel.porLoja} rotuloMes={rotuloRef} />
          <p className="text-xs text-muted-foreground">
            Faturamento e % da meta são calculados das vendas lançadas. Os demais indicadores são lançados por loja e mês em Metas e indicadores
            {filtros.modo !== "mes" ? ` e aparecem aqui para ${rotuloRef}` : ""}.
          </p>
        </>
      )}
    </div>
  );
}
