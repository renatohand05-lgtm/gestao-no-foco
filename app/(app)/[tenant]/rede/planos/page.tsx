import { PlanosGestao } from "@/components/rede/planos-gestao";
import { RelatorioProvider } from "@/components/rede/relatorio";
import { exigirModulo } from "@/lib/rede/acesso";
import { carregarPlanosTela } from "@/lib/rede/loader-qualidade";
import { podeEditar, veRedeInteira } from "@/lib/rede/permissoes";
import { formatarGeradoEm, type RelatorioMeta } from "@/lib/rede/relatorio";

export const metadata = { title: "Rede de lojas — Planos de ação" };

export default async function RedePlanosPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tenant: slug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await exigirModulo(slug, "planos_acao");
  const d = await carregarPlanosTela(ctx, sp);

  // O cabeçalho da impressão e o do CSV são montados na própria tela (os filtros mudam no navegador).
  const meta: RelatorioMeta = {
    titulo: "Planos de ação",
    cliente: ctx.tenant.name,
    filtros: "Conforme os filtros aplicados na tela",
    unidades: "Conforme o filtro de loja aplicado na tela",
    origemDados: "Planos de ação registrados no Gestão no Foco",
  };
  const geradoEm = formatarGeradoEm(new Date());

  return (
    <RelatorioProvider meta={meta} geradoEm={geradoEm} semCabecalho>
    <PlanosGestao
      slug={slug}
      cliente={ctx.tenant.name}
      lojas={d.lojas.map((l) => ({ id: l.id, nome: l.nome }))}
      todasLojas={d.base.lojas.map((l) => ({ id: l.id, nome: l.nome }))}
      planos={d.planos}
      hoje={d.hoje}
      geradoEm={geradoEm}
      escopoParcial={!veRedeInteira(ctx.perfil)}
      editavel={podeEditar(ctx.perfil, "planos_acao")}
      podeVerificar={d.podeVerificar}
      podeVerHistorico={d.podeVerHistorico}
      filtroInicial={d.filtro}
      abrirId={d.abrirId}
      novo={d.novo}
    />
    </RelatorioProvider>
  );
}
