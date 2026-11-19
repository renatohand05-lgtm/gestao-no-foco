import { PlanosGestao } from "@/components/rede/planos-gestao";
import { exigirModulo } from "@/lib/rede/acesso";
import { carregarPlanosTela } from "@/lib/rede/loader-qualidade";
import { podeEditar } from "@/lib/rede/permissoes";

export const metadata = { title: "Rede de lojas — Planos de ação" };

const agora = () => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date());

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

  return (
    <PlanosGestao
      slug={slug}
      cliente={ctx.tenant.name}
      lojas={d.lojas.map((l) => ({ id: l.id, nome: l.nome }))}
      todasLojas={d.base.lojas.map((l) => ({ id: l.id, nome: l.nome }))}
      planos={d.planos}
      hoje={d.hoje}
      geradoEm={agora()}
      editavel={podeEditar(ctx.perfil, "planos_acao")}
      podeVerificar={d.podeVerificar}
      podeVerHistorico={d.podeVerHistorico}
      filtroInicial={d.filtro}
      abrirId={d.abrirId}
      novo={d.novo}
    />
  );
}
