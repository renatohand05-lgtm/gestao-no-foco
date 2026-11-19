import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { IndicadoresDoMes, MetasFaturamento, MetasIndicadores } from "@/components/rede/metas-gestao";
import { SeletorAnoMes } from "@/components/rede/seletor-ano-mes";
import { exigirModulo } from "@/lib/rede/acesso";
import { carregarMetasTela } from "@/lib/rede/loader";
import { ehGestaoDaRede, podeEditar, veRedeInteira } from "@/lib/rede/permissoes";
import { linhasCsvIndicadoresMes, linhasCsvMetasFaturamento, linhasCsvMetasVigentes } from "@/lib/rede/relatorios-csv";
import { RelatorioProvider } from "@/components/rede/relatorio";
import { formatarGeradoEm, unidadesDaTela, type RelatorioMeta } from "@/lib/rede/relatorio";

export const metadata = { title: "Rede de lojas — Metas e indicadores" };

export default async function RedeMetasPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tenant: slug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await exigirModulo(slug, "metas");
  const d = await carregarMetasTela(ctx, sp);
  const lojas = d.base.lojas.filter((l) => l.status !== "inativa");
  const edita = podeEditar(ctx.perfil, "metas");
  const lojasEditaveis = edita ? lojas.map((l) => l.id) : [];
  // Meta padrão da rede: só gestão da rede (administrador/consultor) — o banco também exige.
  const editaRede = edita && ehGestaoDaRede(ctx.perfil);

  const meta: RelatorioMeta = {
    titulo: "Metas e indicadores",
    cliente: ctx.tenant.name,
    filtros: `Indicadores de ${d.mes.slice(5, 7)}/${d.mes.slice(0, 4)}; metas de faturamento de ${d.ano}`,
    unidades: unidadesDaTela(lojas, null, !veRedeInteira(ctx.perfil)),
    origemDados: "Metas e indicadores lançados no Gestão no Foco; indicadores calculados do CMV, da cozinha central, do delivery e do RH quando há dados no mês",
  };

  return (
    <RelatorioProvider meta={meta} geradoEm={formatarGeradoEm(new Date())} className="space-y-5">
      <SeletorAnoMes basePath={`/${slug}/rede/metas`} ano={d.ano} mes={d.mes} />
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <AcoesExportar arquivo="metas-vigentes.csv" linhas={linhasCsvMetasVigentes(lojas, d.base.metas)} rotulo="Metas vigentes (CSV)" />
        <AcoesExportar
          arquivo={`indicadores-${d.mes}.csv`}
          linhas={linhasCsvIndicadoresMes({ lojas, metas: d.base.metas, indicadores: d.indicadores, calculados: d.calculados, mes: d.mes, tolPct: d.base.config.toleranciaSemaforoPct })}
          rotulo="Indicadores do mês (CSV)"
          imprimir={false}
        />
        <AcoesExportar arquivo={`metas-faturamento-${d.ano}.csv`} linhas={linhasCsvMetasFaturamento(lojas, d.metasFat, d.ano)} rotulo="Metas de faturamento (CSV)" imprimir={false} />
      </div>
      <MetasIndicadores slug={slug} lojas={lojas} metas={d.base.metas} editaRede={editaRede} lojasEditaveis={lojasEditaveis} hoje={d.hoje} />
      <MetasFaturamento slug={slug} lojas={lojas} metasFat={d.metasFat} ano={d.ano} lojasEditaveis={lojasEditaveis} />
      <IndicadoresDoMes slug={slug} lojas={lojas} metas={d.base.metas} indicadores={d.indicadores} calculados={d.calculados} mes={d.mes} lojasEditaveis={lojasEditaveis} />
    </RelatorioProvider>
  );
}
