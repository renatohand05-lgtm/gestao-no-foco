import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { CmvGestao } from "@/components/rede/cmv-gestao";
import { CmvGraficos, type DadosCmvGraficos } from "@/components/rede/cmv-graficos";
import { AlertasCmv, TabelaItens, TabelaSemanaLoja } from "@/components/rede/cmv-tabelas";
import { KpiCard } from "@/components/rede/kpi-card";
import { SeletorSemana } from "@/components/rede/seletor-semana";
import { exigirModulo } from "@/lib/rede/acesso";
import { brl, pct1, statusMeta } from "@/lib/rede/calculo";
import { statusDispersao } from "@/lib/rede/financeiro";
import { carregarCmvTela } from "@/lib/rede/loader-financeiro";
import { podeEditar, veRedeInteira } from "@/lib/rede/permissoes";
import { linhasCsvCmvItens, linhasCsvCmvSemanas } from "@/lib/rede/relatorios-csv";
import { RelatorioProvider } from "@/components/rede/relatorio";
import { formatarGeradoEm, unidadesDaTela, type RelatorioMeta } from "@/lib/rede/relatorio";

export const metadata = { title: "Rede de lojas — CMV" };

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const TOM = { ok: "ok", warn: "atencao", bad: "critico", neu: "neutro" } as const;

export default async function RedeCmvPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tenant: slug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await exigirModulo(slug, "cmv");
  const d = await carregarCmvTela(ctx, sp);
  const base = `/${slug}/rede/cmv`;
  const r = d.resumos[d.resumos.length - 1];
  const config = d.base.config;
  const lojasFiltro = d.base.lojas.filter((l) => l.status !== "inativa");
  const nomeLoja = new Map(d.lojas.map((l) => [l.id, l.nome] as const));

  const statusRede = statusMeta(d.metaRede, d.metaRede != null ? "max" : null, r.pctReal, config.toleranciaSemaforoPct);
  const statusDisp = statusDispersao(r.dispersao, config.toleranciaCmv);
  const semContagem = r.contadas === 0;

  const graficos: DadosCmvGraficos = {
    semanas: d.semanas,
    lojas: d.lojas
      .filter((l) => d.calc.some((c) => c.contagem.lojaId === l.id))
      .map((l) => ({ nome: l.nome, real: d.semanas.map((s) => d.calc.find((c) => c.contagem.lojaId === l.id && c.contagem.semana === s)?.pct ?? null) })),
    rede: { real: d.resumos.map((x) => x.pctReal), teorico: d.resumos.map((x) => x.pctTeorico) },
    meta: d.metaRede,
    dispersao: d.calc.filter((c) => c.contagem.semana === d.semana && c.dispersao != null).map((c) => ({ nome: nomeLoja.get(c.contagem.lojaId) ?? "Loja", valor: c.dispersao as number })),
    tolerancia: config.toleranciaCmv,
  };

  const brData = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  const meta: RelatorioMeta = {
    titulo: "CMV semanal",
    cliente: ctx.tenant.name,
    filtros: `Semana de ${brData(d.semana)}${d.semanas.length > 1 ? `; histórico de ${d.semanas.length} semanas` : ""}`,
    unidades: unidadesDaTela(d.lojas, d.lojaFiltro, !veRedeInteira(ctx.perfil)),
    origemDados: "Contagens semanais de estoque e compras lançadas no Gestão no Foco; vendas do módulo Vendas; CMV teórico pelas fichas técnicas",
  };

  return (
    <RelatorioProvider meta={meta} geradoEm={formatarGeradoEm(new Date())} className="space-y-5">
      <SeletorSemana basePath={base} semana={d.semana} hoje={d.hoje} loja={d.lojaFiltro?.slug ?? null} lojas={lojasFiltro.map((l) => ({ slug: l.slug, nome: l.nome }))} />

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <AcoesExportar
          arquivo={`cmv-semanas-${d.semana}.csv`}
          linhas={linhasCsvCmvSemanas({ lojas: d.lojas, calc: d.calc, metas: d.base.metas, tolPct: config.toleranciaSemaforoPct, tolDispersao: config.toleranciaCmv })}
          rotulo="CMV por semana e loja (CSV)"
        />
        <AcoesExportar arquivo={`cmv-itens-${d.semana}.csv`} linhas={linhasCsvCmvItens(d.lojas, d.itens, d.semana)} rotulo="Consumo por item (CSV)" imprimir={false} />
      </div>

      <section aria-label="Indicadores do CMV" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard rotulo="CMV real da rede" valor={r.pctReal != null ? pct1(r.pctReal) : "—"} detalhe={semContagem ? `sem contagem na semana de ${ddmm(d.semana)}` : `semana de ${ddmm(d.semana)}${d.metaRede != null ? ` · meta até ${pct1(d.metaRede)}` : " · sem meta definida"}`} tom={TOM[statusRede]} />
        <KpiCard rotulo="CMV teórico da rede" valor={r.pctTeorico != null ? pct1(r.pctTeorico) : "—"} detalhe="pelas fichas técnicas" />
        <KpiCard rotulo="Dispersão da rede" valor={r.dispersao != null ? `${r.dispersao > 0 ? "+" : ""}${nf1.format(r.dispersao)} p.p.` : "—"} detalhe="real − teórico" tom={TOM[statusDisp]} />
        <KpiCard rotulo="Perda estimada" valor={semContagem ? "—" : brl(r.perda)} detalhe="na semana, acima do teórico" />
        <KpiCard rotulo="Lojas acima da meta" valor={semContagem ? "—" : String(r.acimaMeta)} detalhe={`de ${r.contadas} contadas`} tom={r.acimaMeta > 0 ? "atencao" : "neutro"} />
        <KpiCard rotulo="Lojas fora da tolerância" valor={semContagem ? "—" : String(r.foraTolerancia)} detalhe={`dispersão acima de ${nf1.format(config.toleranciaCmv)} p.p.`} tom={r.foraTolerancia > 0 ? "atencao" : "neutro"} />
      </section>

      {d.mes.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          CMV do mês (soma das contagens cujas semanas começam em {d.semana.slice(5, 7)}/{d.semana.slice(0, 4)}):{" "}
          {d.mes
            .map((m) => `${nomeLoja.get(m.lojaId) ?? "Loja"} ${pct1(m.pct)}`)
            .join(" · ")}
          . Esse valor alimenta o indicador CMV da visão geral e o DRE.
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <CmvGraficos dados={graficos} />
        <AlertasCmv alertas={d.alertas} semana={d.semana} />
      </div>

      <TabelaSemanaLoja basePath={base} lojas={d.lojas} semanas={d.semanas} calc={d.calc} metas={d.base.metas} tolPct={config.toleranciaSemaforoPct} tolDispersao={config.toleranciaCmv} semanaFoco={d.semana} />
      <TabelaItens itens={d.itens} lojas={d.lojas} semana={d.semana} />

      <CmvGestao
        slug={slug}
        lojas={d.lojas.map((l) => ({ id: l.id, nome: l.nome }))}
        semana={d.semana}
        hoje={d.hoje}
        calc={d.calc}
        itens={d.itens}
        vendasModulo={d.vendasModulo}
        editavel={podeEditar(ctx.perfil, "cmv")}
        tolerancia={config.toleranciaCmv}
        lojaInicial={d.lojaFiltro?.id ?? null}
      />
    </RelatorioProvider>
  );
}
