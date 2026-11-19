import { CabecalhoImpressao } from "@/components/rede/cabecalho-impressao";
import { KpiCard } from "@/components/rede/kpi-card";
import { RhMovimentos } from "@/components/rede/rh-movimentos";
import { RhNav } from "@/components/rede/rh-nav";
import { RhOcorrencias } from "@/components/rede/rh-ocorrencias";
import { RhQuadro } from "@/components/rede/rh-quadro";
import { exigirModulo } from "@/lib/rede/acesso";
import { pct1 } from "@/lib/rede/calculo";
import { carregarRhTela } from "@/lib/rede/loader-rh";
import { JANELA_OCORRENCIAS_MESES, kpisOcorrencias, montarQuadro, ocorrenciasRecentes, statusQuadro, tempoMedioDeCasa, textoTempoDeCasa, ultimoMesRh } from "@/lib/rede/rh";

export const metadata = { title: "Rede de lojas — RH" };

const ROTULO_ABA = { quadro: "Quadro de pessoal", movimentos: "Turnover e absenteísmo", ocorrencias: "Ocorrências e advertências" } as const;
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const mesTxt = (iso: string) => `${MESES[Number(iso.slice(5, 7)) - 1]}/${iso.slice(2, 4)}`;
const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const TOM = { ok: "ok", warn: "atencao", bad: "critico" } as const;
const agora = () => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date());

export default async function RedeRhPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tenant: slug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await exigirModulo(slug, ["rh_quadro", "rh_movimentos", "rh_ocorrencias"]);
  const d = await carregarRhTela(ctx, sp);
  const base = `/${slug}/rede/rh`;
  const lojasDaTela = d.lojaFiltro ? [d.lojaFiltro] : d.lojas;
  const ids = lojasDaTela.map((l) => l.id);
  const refs = lojasDaTela.map((l) => ({ id: l.id, nome: l.nome }));
  const colaboradores = d.colaboradores ?? [];

  return (
    <div className="space-y-5">
      <CabecalhoImpressao
        titulo={`RH — ${ROTULO_ABA[d.aba]}`}
        cliente={ctx.tenant.name}
        filtros={d.lojaFiltro ? d.lojaFiltro.nome : "Todas as lojas"}
        unidades={d.lojaFiltro ? d.lojaFiltro.nome : `Rede toda (${d.lojas.length} ${d.lojas.length === 1 ? "unidade" : "unidades"})`}
        geradoEm={agora()}
        origemDados="Cadastro e lançamentos de RH registrados no Gestão no Foco"
      />
      <RhNav basePath={base} abas={d.abas.map((a) => ({ chave: a, rotulo: ROTULO_ABA[a] }))} aba={d.aba} loja={d.lojaFiltro?.slug ?? null} lojas={d.lojas.map((l) => ({ slug: l.slug, nome: l.nome }))} />

      {d.aba === "quadro" ? (
        <>
          <QuadroKpis d={d} ids={ids} />
          <RhQuadro slug={slug} hoje={d.hoje} lojas={refs} colaboradores={colaboradores} previstos={d.previstos} editavel={d.edita.quadro} />
        </>
      ) : null}

      {d.aba === "movimentos" ? (
        <RhMovimentos slug={slug} hoje={d.hoje} mesAtual={d.mesAtual} lojas={refs} mensais={d.mensais ?? []} colaboradores={d.colaboradores} editavel={d.edita.movimentos} />
      ) : null}

      {d.aba === "ocorrencias" ? <OcorrenciasConteudo slug={slug} d={d} refs={refs} /> : null}
    </div>
  );
}

function QuadroKpis({ d, ids }: { d: Awaited<ReturnType<typeof carregarRhTela>>; ids: string[] }) {
  const colaboradores = d.colaboradores ?? [];
  const q = montarQuadro(colaboradores, d.previstos, ids);
  const ativos = colaboradores.filter((c) => c.status === "ativo");
  const casa = tempoMedioDeCasa(ativos, d.hoje);
  const ult = d.mensais ? ultimoMesRh(d.mensais, ids) : null;
  return (
    <section aria-label="Indicadores do quadro de pessoal" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard rotulo="Colaboradores ativos" valor={nf0.format(q.total.ativo)} detalhe={`de ${nf0.format(q.total.previsto)} previstos`} progresso={q.total.previsto > 0 ? (q.total.ativo / q.total.previsto) * 100 : null} tom={TOM[statusQuadro(q.total.ativo, q.total.previsto)]} />
      <KpiCard rotulo="Vagas abertas" valor={nf0.format(q.vagas)} detalhe="para completar o quadro" tom={q.vagas > 0 ? "atencao" : "neutro"} />
      {d.mensais ? (
        <>
          <KpiCard rotulo="Turnover" valor={ult?.turnover != null ? pct1(ult.turnover) : "—"} detalhe={ult ? `${mesTxt(ult.mes)} · ${ult.lojas > 1 ? "rede selecionada" : "loja selecionada"}` : "sem histórico ainda"} />
          <KpiCard rotulo="Absenteísmo" valor={ult?.absenteismo != null ? pct1(ult.absenteismo) : "—"} detalhe={ult ? `${mesTxt(ult.mes)} · ${ult.lojas > 1 ? "rede selecionada" : "loja selecionada"}` : "sem histórico ainda"} />
        </>
      ) : null}
      <KpiCard rotulo="Tempo médio de casa" valor={casa == null ? "—" : textoTempoDeCasa(Math.round(casa))} detalhe="de quem está ativo" />
    </section>
  );
}

function OcorrenciasConteudo({ slug, d, refs }: { slug: string; d: Awaited<ReturnType<typeof carregarRhTela>>; refs: { id: string; nome: string }[] }) {
  const ocorrencias = d.ocorrencias ?? [];
  const k = kpisOcorrencias(ocorrenciasRecentes(ocorrencias, d.hoje));
  const janela = `${JANELA_OCORRENCIAS_MESES} meses`;
  return (
    <>
      <section aria-label="Indicadores de ocorrências" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard rotulo="Advertências" valor={nf0.format(k.advertencias)} detalhe={`verbais e escritas · ${janela}`} tom={k.advertencias > 0 ? "atencao" : "neutro"} />
        <KpiCard rotulo="Suspensões" valor={nf0.format(k.suspensoes)} detalhe={janela} tom={k.suspensoes > 0 ? "critico" : "neutro"} />
        <KpiCard rotulo="Faltas injustificadas" valor={nf0.format(k.faltas)} detalhe={janela} />
        <KpiCard rotulo="Atrasos" valor={nf0.format(k.atrasos)} detalhe={janela} />
        <KpiCard rotulo="Atestados" valor={nf0.format(k.atestados)} detalhe={janela} />
        <KpiCard rotulo="Elogios e treinamentos" valor={nf0.format(k.elogiosTreinamentos)} detalhe={janela} />
      </section>
      <RhOcorrencias slug={slug} hoje={d.hoje} lojas={refs} colaboradores={d.colaboradores} ocorrencias={ocorrencias} editavel={d.edita.ocorrencias} />
    </>
  );
}
