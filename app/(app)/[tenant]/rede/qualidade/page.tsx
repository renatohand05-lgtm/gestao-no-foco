import { CabecalhoImpressao } from "@/components/rede/cabecalho-impressao";
import { FiltroLoja } from "@/components/rede/cozinha-nav";
import { QualidadeGestao } from "@/components/rede/qualidade-gestao";
import { exigirModulo } from "@/lib/rede/acesso";
import { carregarQualidadeTela } from "@/lib/rede/loader-qualidade";
import { podeEditar } from "@/lib/rede/permissoes";

export const metadata = { title: "Rede de lojas — Checklist de qualidade" };

const agora = () => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date());

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

  return (
    <div className="space-y-5">
      <CabecalhoImpressao
        titulo="Checklist de qualidade"
        cliente={ctx.tenant.name}
        filtros="Visitas dos últimos 2 anos"
        unidades={d.lojaFiltro ? d.lojaFiltro.nome : `Rede toda (${d.lojas.length} ${d.lojas.length === 1 ? "unidade" : "unidades"})`}
        geradoEm={agora()}
        origemDados="Visitas de qualidade registradas no Gestão no Foco"
      />
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
    </div>
  );
}
