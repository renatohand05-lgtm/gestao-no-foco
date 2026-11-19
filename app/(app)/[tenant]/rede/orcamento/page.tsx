import { OrcamentoCenarios } from "@/components/rede/orcamento-cenarios";
import { OrcamentoExpansao } from "@/components/rede/orcamento-expansao";
import { exigirModulo } from "@/lib/rede/acesso";
import { carregarOrcamentoTela } from "@/lib/rede/loader-financeiro";
import { podeEditar, veRedeInteira } from "@/lib/rede/permissoes";
import { RelatorioProvider } from "@/components/rede/relatorio";
import { formatarGeradoEm, unidadesDaTela, type RelatorioMeta } from "@/lib/rede/relatorio";

export const metadata = { title: "Rede de lojas — Orçamento e expansão" };

export default async function RedeOrcamentoPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const ctx = await exigirModulo(slug, "orcamento");
  const d = await carregarOrcamentoTela(ctx);
  const editavel = podeEditar(ctx.perfil, "orcamento");

  const lojasOrc = d.base.lojas.filter((l) => l.status !== "inativa");
  const meta: RelatorioMeta = {
    titulo: "Orçamento e expansão",
    cliente: ctx.tenant.name,
    filtros: `Cenários de orçamento e calendário de inaugurações${d.mesRef ? `; base do mês ${d.mesRef.slice(5, 7)}/${d.mesRef.slice(0, 4)}` : ""}`,
    unidades: `${unidadesDaTela(lojasOrc, null, !veRedeInteira(ctx.perfil))}${d.unidades.length > 0 ? `; ${d.unidades.length} ${d.unidades.length === 1 ? "inauguração" : "inaugurações"} no calendário` : ""}`,
    origemDados: "Cenários, premissas e calendário de inaugurações do Gestão no Foco; faturamento e custos do DRE do mês de base",
  };

  return (
    <RelatorioProvider meta={meta} geradoEm={formatarGeradoEm(new Date())} className="space-y-5">
      <OrcamentoCenarios slug={slug} cenarios={d.cenarios} editavel={editavel} />
      <OrcamentoExpansao
        slug={slug}
        unidades={d.unidades}
        cenarios={d.cenarios}
        lojas={d.base.lojas.filter((l) => l.status !== "inativa")}
        config={d.config}
        baseDre={d.baseDre}
        mesRef={d.mesRef}
        hoje={d.hoje}
        editavel={editavel}
      />
    </RelatorioProvider>
  );
}
