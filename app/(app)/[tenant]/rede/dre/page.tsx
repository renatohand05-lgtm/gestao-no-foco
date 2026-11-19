import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { ComparativoDre, LancamentosDre, PremissasDreEditor, type AtualPorLinha, type OpcaoComparativo } from "@/components/rede/dre-gestao";
import { DreGraficos, type DadosDreGraficos } from "@/components/rede/dre-graficos";
import { TabelaDre, type ColunaDre } from "@/components/rede/dre-tabelas";
import { FiltrosRedeBarra } from "@/components/rede/filtros-rede";
import { KpiCard } from "@/components/rede/kpi-card";
import { exigirModulo } from "@/lib/rede/acesso";
import { brl, pct1 } from "@/lib/rede/calculo";
import { CHAVE_DRE, compararDre, consolidarDre, distribuicaoDeCem, linhasCsvDre, type DreCalc } from "@/lib/rede/financeiro";
import { carregarDreTela } from "@/lib/rede/loader-financeiro";
import { ehGestaoDaRede, podeEditar } from "@/lib/rede/permissoes";
import { LINHAS_DRE_LANCAVEIS, type LinhaDreKey } from "@/lib/rede/tipos";

export const metadata = { title: "Rede de lojas — DRE" };

export default async function RedeDrePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tenant: slug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await exigirModulo(slug, "dre");
  const d = await carregarDreTela(ctx, sp);
  const rotuloMes = `${d.mes.slice(5, 7)}/${d.mes.slice(0, 4)}`;
  const lojasAtivas = d.base.lojas.filter((l) => l.status !== "inativa");
  const edita = podeEditar(ctx.perfil, "dre");
  const editaRede = edita && ehGestaoDaRede(ctx.perfil);

  const comVendas = d.dre.porLoja.filter((p) => !p.realizado.semVendas);
  const rede = d.dre.realizadoRede;
  const estimadasRede = d.dre.linhasEstimadas;
  const totalLinhas = d.dre.linhasTotal;

  const colunas: ColunaDre[] = [
    ...comVendas.map((p) => ({ nome: p.loja.nome, d: p.realizado.d, estimadas: p.realizado.estimadas })),
    ...(rede && comVendas.length > 1 ? [{ nome: "Rede", d: rede, estimadas: null, rede: true }] : []),
  ];

  // Orçado × realizado: a rede só compara as lojas que têm meta E vendas (mesmo conjunto dos dois lados).
  const comAmbos = comVendas.filter((p) => p.orcado != null);
  const opcoes: OpcaoComparativo[] = [
    ...(comVendas.length > 1
      ? [
          {
            id: "rede",
            nome: "Rede (lojas com meta e vendas)",
            temOrcado: comAmbos.length > 0,
            semMetaMotivo: "Nenhuma loja com vendas tem meta de faturamento no mês.",
            linhas: compararDre(comAmbos.length ? consolidarDre(comAmbos.map((p) => p.orcado as DreCalc)) : null, comAmbos.length ? consolidarDre(comAmbos.map((p) => p.realizado.d)) : (rede as DreCalc)),
          },
        ]
      : []),
    ...comVendas.map((p) => ({
      id: p.loja.id,
      nome: p.loja.nome,
      temOrcado: p.orcado != null,
      semMetaMotivo: `${p.loja.nome} não tem meta de faturamento em ${rotuloMes}: defina em Metas e indicadores para ver o orçado.`,
      linhas: compararDre(p.orcado, p.realizado.d),
    })),
  ];

  const atuais: AtualPorLinha = {};
  for (const p of d.dre.porLoja) {
    const linhas: AtualPorLinha[string] = {};
    for (const { k } of LINHAS_DRE_LANCAVEIS) linhas[k as LinhaDreKey] = { valor: p.realizado.d[CHAVE_DRE[k]], fonte: p.realizado.fontes[k] };
    atuais[p.loja.id] = linhas;
  }

  const graficos: DadosDreGraficos = {
    rotuloMes,
    lojas: comVendas.map((p) => ({ nome: p.loja.nome, resultado: p.realizado.d.res, margem: p.realizado.d.mg, orcado: p.orcado?.res ?? null })),
    evolucao: d.evolucao.map((e) => ({ mes: e.mes, resultado: e.resultado, margem: e.margem })),
    distribuicao: rede ? distribuicaoDeCem(rede) : [],
  };

  const orcRede = d.dre.orcadoRede;
  const resultadoTom = rede ? (rede.res >= 0 ? "ok" : "critico") : "neutro";

  return (
    <div className="space-y-5">
      <FiltrosRedeBarra basePath={`/${slug}/rede/dre`} filtros={d.filtros} lojas={lojasAtivas.map((l) => ({ slug: l.slug, nome: l.nome }))} modos={["mes"]} />

      {comVendas.length > 0 && estimadasRede > 0 ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200" role="note">
          <strong>{estimadasRede} de {totalLinhas} linhas de custo</strong> ({comVendas.length} {comVendas.length === 1 ? "loja" : "lojas"} × 9 linhas) ainda são <strong>estimativas pelas premissas</strong>, não despesas pagas. Lance o valor real em “Lançamentos reais” para substituir a estimativa.
        </p>
      ) : null}

      <section aria-label="Indicadores do DRE" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard rotulo="Faturamento da rede" valor={rede ? brl(rede.fat) : "—"} detalhe={`${rotuloMes} · ${comVendas.length} ${comVendas.length === 1 ? "loja" : "lojas"} com vendas`} />
        <KpiCard rotulo="Resultado operacional" valor={rede ? brl(rede.res) : "—"} detalhe={orcRede ? `orçado ${brl(orcRede.res)} (lojas com meta)` : "sem meta de faturamento para orçar"} tom={resultadoTom} />
        <KpiCard rotulo="Margem operacional" valor={rede ? pct1(rede.mg) : "—"} detalhe="resultado ÷ faturamento bruto" tom={resultadoTom} />
        <KpiCard rotulo="Ponto de equilíbrio da rede" valor={rede?.pe != null ? brl(rede.pe) : "—"} detalhe={rede?.pe != null && rede.fat > 0 ? `${pct1((rede.pe / rede.fat) * 100)} do faturamento` : "faturamento em que o resultado é zero"} />
        <KpiCard rotulo="Linhas estimadas" valor={totalLinhas > 0 ? `${estimadasRede}/${totalLinhas}` : "—"} detalhe="ainda pela premissa" tom={estimadasRede > 0 ? "atencao" : "ok"} />
      </section>

      <DreGraficos dados={graficos} />

      <TabelaDre titulo={`DRE do mês — ${rotuloMes}`} descricao="Loja a loja e consolidado. CMV das contagens semanais; vendas do módulo Vendas; custos pela premissa até serem lançados." colunas={colunas} />
      {colunas.length > 0 ? (
        <AcoesExportar arquivo={`dre-${d.mes}.csv`} linhas={linhasCsvDre(`DRE ${rotuloMes}`, colunas.map((c) => ({ nome: c.nome, d: c.d }))) as (string | number | null)[][]} />
      ) : null}

      <ComparativoDre opcoes={opcoes} rotuloMes={rotuloMes} arquivo={`dre-orcado-realizado-${d.mes}.csv`} />

      <LancamentosDre
        slug={slug}
        mes={d.mes}
        lojas={d.dre.porLoja.map((p) => ({ id: p.loja.id, nome: p.loja.nome }))}
        lancamentos={d.lancamentos}
        atuais={atuais}
        editavel={edita}
      />

      <PremissasDreEditor
        slug={slug}
        lojas={lojasAtivas.map((l) => ({ id: l.id, nome: l.nome }))}
        rows={d.premissasRows}
        editaRede={editaRede}
        lojasEditaveis={edita ? lojasAtivas.map((l) => l.id) : []}
      />
    </div>
  );
}
