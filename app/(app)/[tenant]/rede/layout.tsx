import { FlaskConical, LayoutGrid } from "lucide-react";

import { RedeNav } from "@/components/rede/rede-nav";
import { ModuleHeader } from "@/components/layout/module-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getRedeContexto } from "@/lib/rede/acesso";
import { carregarConfigAmbiente } from "@/lib/rede/loader";
import { MENU_REDE } from "@/lib/rede/menu";
import { podeVer } from "@/lib/rede/permissoes";

export const metadata = { title: "Rede de lojas" };

export default async function RedeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const ctx = await getRedeContexto(slug);

  if (!ctx.perfil) {
    return (
      <div className="space-y-6">
        <ModuleHeader title="Rede de lojas" description={ctx.tenant.name} />
        <EmptyState
          icon={LayoutGrid}
          title="Você ainda não tem acesso à rede de lojas"
          description="Peça a quem administra a empresa para liberar o seu acesso (perfil e lojas) em Rede de lojas → Lojas e acessos."
        />
      </div>
    );
  }

  const ambiente = await carregarConfigAmbiente(ctx);
  const itens = MENU_REDE.filter((m) => podeVer(ctx.perfil, m.modulo)).map(({ href, label }) => ({ href, label }));

  return (
    <div className="space-y-5">
      <ModuleHeader title="Rede de lojas" description={`Painel operacional — ${ctx.tenant.name}`} breadcrumbs={[{ label: "Rede de lojas" }]} />
      {ambiente === "demonstracao" ? (
        <div role="note" className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <strong>Ambiente de demonstração.</strong> Os números desta empresa são exemplos para treinamento e apresentação; não são dados reais do cliente.
          </p>
        </div>
      ) : null}
      <RedeNav base={`/${slug}/rede`} itens={itens} />
      {children}
    </div>
  );
}
