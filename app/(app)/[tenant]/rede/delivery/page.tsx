import { DeliveryGestao } from "@/components/rede/delivery-gestao";
import { FiltroLoja } from "@/components/rede/cozinha-nav";
import { exigirModulo } from "@/lib/rede/acesso";
import { carregarDeliveryTela } from "@/lib/rede/loader-cozinha";
import { podeEditar, podeVer } from "@/lib/rede/permissoes";

export const metadata = { title: "Rede de lojas — Checklist de delivery" };

export default async function RedeDeliveryPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tenant: slug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await exigirModulo(slug, "delivery");
  const d = await carregarDeliveryTela(ctx, sp);
  const lojasDaTela = d.base.lojas.filter((l) => l.status !== "inativa");

  return (
    <div className="space-y-5">
      <FiltroLoja basePath={`/${slug}/rede/delivery`} loja={d.lojaFiltro?.slug ?? null} lojas={lojasDaTela.map((l) => ({ slug: l.slug, nome: l.nome }))} />
      <DeliveryGestao
        slug={slug}
        lojas={lojasDaTela.map((l) => ({ id: l.id, nome: l.nome }))}
        registros={d.registros}
        metas={d.base.metas}
        tolPct={d.base.config.toleranciaSemaforoPct}
        hoje={d.hoje}
        editavel={podeEditar(ctx.perfil, "delivery")}
        rupturasPorSemana={podeVer(ctx.perfil, "rupturas") ? d.rupturasPorSemana : null}
        lojaInicial={d.lojaFiltro?.id ?? null}
        planosPorRegistro={d.planosPorRegistro}
        podeGerarPlanos={d.podeGerarPlanos}
      />
    </div>
  );
}
