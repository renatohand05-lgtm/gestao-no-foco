import { AcessosGestao, ConfigRedeForm, LojasGestao } from "@/components/rede/lojas-acessos";
import { exigirModulo } from "@/lib/rede/acesso";
import { carregarGestao } from "@/lib/rede/loader";

export const metadata = { title: "Rede de lojas — Lojas e acessos" };

export default async function RedeLojasPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const ctx = await exigirModulo(slug, "config");
  const d = await carregarGestao(ctx);
  return (
    <div className="space-y-5">
      <LojasGestao slug={slug} lojas={d.base.lojas} />
      <ConfigRedeForm slug={slug} config={d.base.config} />
      <AcessosGestao slug={slug} lojas={d.base.lojas.filter((l) => l.status !== "inativa")} acessos={d.acessos} membros={d.membros} />
    </div>
  );
}
