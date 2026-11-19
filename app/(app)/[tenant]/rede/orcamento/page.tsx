import { OrcamentoCenarios } from "@/components/rede/orcamento-cenarios";
import { OrcamentoExpansao } from "@/components/rede/orcamento-expansao";
import { exigirModulo } from "@/lib/rede/acesso";
import { carregarOrcamentoTela } from "@/lib/rede/loader-financeiro";
import { podeEditar } from "@/lib/rede/permissoes";

export const metadata = { title: "Rede de lojas — Orçamento e expansão" };

export default async function RedeOrcamentoPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const ctx = await exigirModulo(slug, "orcamento");
  const d = await carregarOrcamentoTela(ctx);
  const editavel = podeEditar(ctx.perfil, "orcamento");

  return (
    <div className="space-y-5">
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
    </div>
  );
}
