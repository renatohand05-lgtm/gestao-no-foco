import { FiltrosRedeBarra } from "@/components/rede/filtros-rede";
import { VendasGestao } from "@/components/rede/vendas-gestao";
import { exigirModulo } from "@/lib/rede/acesso";
import { rotuloPeriodo } from "@/lib/rede/filtros";
import { carregarVendasTela } from "@/lib/rede/loader";
import { podeEditar, veRedeInteira } from "@/lib/rede/permissoes";
import { RelatorioProvider } from "@/components/rede/relatorio";
import { formatarGeradoEm, unidadesDaTela, type RelatorioMeta } from "@/lib/rede/relatorio";

export const metadata = { title: "Rede de lojas — Vendas" };

export default async function RedeVendasPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tenant: slug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await exigirModulo(slug, "vendas");
  const d = await carregarVendasTela(ctx, sp);
  const lojasAtivas = d.base.lojas.filter((l) => l.status !== "inativa");

  const meta: RelatorioMeta = {
    titulo: "Vendas por loja",
    cliente: ctx.tenant.name,
    filtros: `Período ${rotuloPeriodo(d.filtros)}`,
    unidades: unidadesDaTela(lojasAtivas, d.lojaFiltro, !veRedeInteira(ctx.perfil)),
    origemDados: "Vendas diárias lançadas ou importadas no Gestão no Foco",
  };

  return (
    <RelatorioProvider meta={meta} geradoEm={formatarGeradoEm(new Date())} className="space-y-5">
      <FiltrosRedeBarra basePath={`/${slug}/rede/vendas`} filtros={d.filtros} lojas={lojasAtivas.map((l) => ({ slug: l.slug, nome: l.nome }))} />
      <VendasGestao
        slug={slug}
        lojas={lojasAtivas.map((l) => ({ id: l.id, slug: l.slug, nome: l.nome, canais: l.canais }))}
        vendas={d.vendas}
        editavel={podeEditar(ctx.perfil, "vendas")}
        hoje={d.hoje}
        rotuloPeriodo={rotuloPeriodo(d.filtros)}
      />
    </RelatorioProvider>
  );
}
