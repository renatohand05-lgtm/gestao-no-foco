import { IndicadoresDoMes, MetasFaturamento, MetasIndicadores } from "@/components/rede/metas-gestao";
import { SeletorAnoMes } from "@/components/rede/seletor-ano-mes";
import { exigirModulo } from "@/lib/rede/acesso";
import { carregarMetasTela } from "@/lib/rede/loader";
import { ehGestaoDaRede, podeEditar } from "@/lib/rede/permissoes";

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

  return (
    <div className="space-y-5">
      <SeletorAnoMes basePath={`/${slug}/rede/metas`} ano={d.ano} mes={d.mes} />
      <MetasIndicadores slug={slug} lojas={lojas} metas={d.base.metas} editaRede={editaRede} lojasEditaveis={lojasEditaveis} hoje={d.hoje} />
      <MetasFaturamento slug={slug} lojas={lojas} metasFat={d.metasFat} ano={d.ano} lojasEditaveis={lojasEditaveis} />
      <IndicadoresDoMes slug={slug} lojas={lojas} metas={d.base.metas} indicadores={d.indicadores} calculados={d.calculados} mes={d.mes} lojasEditaveis={lojasEditaveis} />
    </div>
  );
}
