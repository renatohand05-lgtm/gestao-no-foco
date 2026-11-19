import { CozinhaEstoque } from "@/components/rede/cozinha-estoque";
import { CozinhaGraficos } from "@/components/rede/cozinha-graficos";
import { CozinhaNav } from "@/components/rede/cozinha-nav";
import { CozinhaRupturas } from "@/components/rede/cozinha-rupturas";
import { KpiCard } from "@/components/rede/kpi-card";
import { StatusPill } from "@/components/rede/status";
import { SectionCard } from "@/components/ui/section-card";
import { exigirModulo } from "@/lib/rede/acesso";
import { brl, pct1 } from "@/lib/rede/calculo";
import { SEMANAS_NA_RUPTURA } from "@/lib/rede/cozinha";
import { carregarCozinhaTela } from "@/lib/rede/loader-cozinha";
import { podeEditar, podeVer } from "@/lib/rede/permissoes";

export const metadata = { title: "Rede de lojas — Cozinha central" };

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const ROTULO_ABA = { rupturas: "Rupturas", estoque: "Estoque da cozinha central" } as const;

export default async function RedeCozinhaPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tenant: slug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await exigirModulo(slug, ["rupturas", "estoque_cc"]);
  const d = await carregarCozinhaTela(ctx, sp);
  const base = `/${slug}/rede/cozinha`;
  const nomeLoja = new Map(d.base.lojas.map((l) => [l.id, l.nome] as const));
  const lojasDaTela = d.base.lojas.filter((l) => l.status !== "inativa");
  const r = d.resumo;
  const e = d.estoque;

  return (
    <div className="space-y-5">
      <CozinhaNav
        basePath={base}
        abas={d.abas.map((a) => ({ chave: a, rotulo: ROTULO_ABA[a] }))}
        aba={d.aba}
        loja={d.lojaFiltro?.slug ?? null}
        lojas={lojasDaTela.map((l) => ({ slug: l.slug, nome: l.nome }))}
      />

      {d.aba === "rupturas" ? (
        <>
          <section aria-label="Indicadores de rupturas" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard rotulo="Rupturas na última semana" valor={nf0.format(r.naUltimaSemana)} detalhe={r.ultimaSemana ? `semana de ${ddmm(r.ultimaSemana)}` : "nenhuma ruptura registrada"} />
            <KpiCard rotulo="Lojas acima da meta" valor={nf0.format(r.lojasAcima)} detalhe={`mais de ${nf0.format(d.metaPadrao)} na semana`} tom={r.lojasAcima > 0 ? "atencao" : "neutro"} />
            <KpiCard rotulo="Horas de item indisponível" valor={nf0.format(r.horas)} detalhe={`últimas ${r.semanas.length} semanas`} />
            <KpiCard rotulo="Causadas pela cozinha central" valor={pct1(r.pctCentral)} detalhe="falta ou atraso de entrega" progresso={r.pctCentral} />
          </section>

          {r.semanas.length > 0 ? (
            <>
              <CozinhaGraficos
                dados={{
                  semanas: r.semanas,
                  lojas: r.porLoja.map((l) => ({ nome: nomeLoja.get(l.lojaId) ?? "Loja", contagens: l.contagens })),
                  meta: d.metaPadrao,
                  itens: r.itens.map((i) => ({ item: i.item, total: i.total })),
                  motivos: r.motivos,
                }}
              />
              <SectionCard title="Rupturas por semana e loja" description={`Meta: até ${nf0.format(d.metaPadrao)} por loja na semana. Verde até a meta, amarelo uma acima, vermelho mais que isso. Últimas ${SEMANAS_NA_RUPTURA} semanas com ruptura registrada.`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Loja</th>
                        {r.semanas.map((s) => (
                          <th key={s} className="py-2 pr-3 text-right font-medium">
                            Sem. {ddmm(s)}
                          </th>
                        ))}
                        <th className="py-2 text-right font-medium">Média</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.porLoja.map((l) => (
                        <tr key={l.lojaId} className="border-b border-border/60 last:border-0">
                          <td className="py-2 pr-3 font-medium">{nomeLoja.get(l.lojaId) ?? "Loja"}</td>
                          {l.contagens.map((c, i) => (
                            <td key={r.semanas[i]} className="py-2 pr-3 text-right">
                              <StatusPill status={l.status[i]} className="min-w-11 justify-center">
                                {c}
                              </StatusPill>
                            </td>
                          ))}
                          <td className="py-2 text-right font-semibold tabular-nums">{nf1.format(l.media)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </>
          ) : null}

          <CozinhaRupturas
            slug={slug}
            lojas={lojasDaTela.map((l) => ({ id: l.id, nome: l.nome }))}
            rupturas={d.rupturas}
            sugestoes={[...new Set([...d.produtos.map((p) => p.item), ...d.rupturas.map((x) => x.item)])].sort((a, b) => a.localeCompare(b, "pt-BR"))}
            hoje={d.hoje}
            editavel={podeEditar(ctx.perfil, "rupturas")}
            lojaInicial={d.lojaFiltro?.id ?? null}
          />
        </>
      ) : (
        <>
          <section aria-label="Indicadores do estoque" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard rotulo="Valor em estoque" valor={brl(e.valor)} detalhe={`${nf0.format(e.itens)} itens`} />
            <KpiCard rotulo="Itens críticos" valor={nf0.format(e.criticos)} detalhe="abaixo do mínimo" tom={e.criticos > 0 ? "critico" : "neutro"} />
            <KpiCard rotulo="Itens em atenção" valor={nf0.format(e.atencao)} detalhe="perto do mínimo ou menos de 3 dias" tom={e.atencao > 0 ? "atencao" : "neutro"} />
            <KpiCard rotulo="Cobertura média" valor={e.coberturaMedia == null ? "—" : nf0.format(e.coberturaMedia)} detalhe="dias de consumo" />
          </section>
          <CozinhaEstoque
            slug={slug}
            linhas={e.linhas}
            rupturas={podeVer(ctx.perfil, "rupturas") ? d.rupturasPorProduto : null}
            semanasRupturas={SEMANAS_NA_RUPTURA}
            editavel={podeEditar(ctx.perfil, "estoque_cc")}
          />
        </>
      )}
    </div>
  );
}
