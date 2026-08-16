import { CommunicationSettingsForm } from "@/components/retention/communication-settings-form";
import { PageHeader } from "@/components/ui/page-header";
import { emailHealth, whatsappHealth } from "@/lib/retention/providers/runtime";
import { createCommunicationSettingsService } from "@/lib/retention/settings-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Comunicações" };

export default async function ComunicoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const settings = await createCommunicationSettingsService(tenant.id).then((s) =>
    s.get(),
  );
  const wa = whatsappHealth();
  const em = emailHealth();

  return (
    <div className="space-y-6" data-phase35="comunicacoes">
      <PageHeader
        title="Comunicações"
        description="Canais, preferências e janela de envio. Sem credenciais na tela."
      />
      <CommunicationSettingsForm
        tenantSlug={tenantSlug}
        initial={settings}
        whatsapp={{ label: wa.label, status: wa.status }}
        email={{ label: em.label, status: em.status }}
      />
    </div>
  );
}
