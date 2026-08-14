import { Workflow } from "lucide-react";

import { ComingSoonPanel } from "@/components/pilot/coming-soon-panel";
import { PageHeader } from "@/components/ui/page-header";
import { requireTenant } from "@/lib/tenants";

export const metadata = {
  title: "Automações",
  description: "Automações internas — em breve",
};

/**
 * Sprint 34.5 — Automações ocultas da sidebar e sem seed demo.
 * Rota profunda mostra estado honesto "Em breve".
 */
export default async function AutomacoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  try {
    await requireTenant(tenantSlug);
  } catch {
    return (
      <div className="space-y-4 p-4 sm:p-6" data-automacoes-page="auth">
        <h1 className="text-xl font-semibold">Automações</h1>
        <p className="text-sm text-destructive" role="alert">
          Sessão ou empresa indisponível.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6" data-automacoes-page="coming-soon">
      <PageHeader
        title="Automações"
        description="Regras e fluxos internos para reduzir trabalho manual."
      />
      <ComingSoonPanel
        icon={Workflow}
        title="Automações em breve"
        description="Este módulo ainda não está liberado no piloto. Não há regras ativas nem envio automático de e-mails ou ações externas."
        primaryAction={{
          label: "Voltar ao dashboard",
          href: `/${tenantSlug}/dashboard`,
        }}
        testId="automacoes-coming-soon"
      />
    </div>
  );
}
