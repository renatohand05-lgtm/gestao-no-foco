import { FiltroLoja } from "@/components/rede/cozinha-nav";
import { QualidadeGestao } from "@/components/rede/qualidade-gestao";
import { exigirModulo } from "@/lib/rede/acesso";
import { carregarQualidadeTela } from "@/lib/rede/loader-qualidade";
import { podeEditar, veRedeInteira } from "@/lib/rede/permissoes";
import { RelatorioProvider } from "@/components/rede/relatorio";
import { formatarGeradoEm, unidadesDaTela, type RelatorioMeta } from "@/lib/rede/relatorio";

export const metadata = { title: "Rede de lojas — Checklist de qualidade" };

export default async function RedeQualidadePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tenant: slug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await exigirModulo(slug, "qualidade");
  const d = await carregarQualidadeTela(ctx, sp);

  const meta: RelatorioMeta = {
    titulo: "Checklist de qualidade",
    cliente: ctx.tenant.name,
    filtros: "Visitas dos últimos 2 anos",
    unidades: unidadesDaTela(d.lojas, d.lojaFiltro, !veRedeInteira(ctx.perfil)),
    origemDados: "Visitas de qualidade registradas no Gestão no Foco",
  };

  return (
    <RelatorioProvider meta={meta} geradoEm={formatarGeradoEm(new Date())} className="space-y-5">
      <FiltroLoja basePath={`/${slug}/rede/qualidade`} loja={d.lojaFiltro?.slug ?? null} lojas={d.lojas.map((l) => ({ slug: l.slug, nome: l.nome }))} />
      <QualidadeGestao
        slug={slug}
        lojas={d.lojas.map((l) => ({ id: l.id, nome: l.nome }))}
        lojaFiltro={d.lojaFiltro?.id ?? null}
        visitas={d.visitas}
        planos={d.planos}
        resumo={d.resumo}
        hoje={d.hoje}
        editavel={podeEditar(ctx.perfil, "qualidade")}
        podeGerarPlanos={d.podeGerarPlanos}
        abrir={d.abrir}
      />
    </RelatorioProvider>
  );
}
