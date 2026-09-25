import { CommunicationSettingsForm } from "@/components/retention/communication-settings-form";
import { WhatsAppChannelConnect } from "@/components/retention/whatsapp-channel-connect";
import { PageHeader } from "@/components/ui/page-header";
import { emailHealth, whatsappHealth } from "@/lib/retention/providers/runtime";
import {
  operatorChannelLabel,
  resolveCommunicationMode,
} from "@/lib/retention/test-mode";
import { createCommunicationSettingsService } from "@/lib/retention/settings-service";
import { getWhatsAppChannelStatusAction } from "@/lib/retention/whatsapp-channel-actions";
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
  const commMode = resolveCommunicationMode();
  const whatsappOperator = operatorChannelLabel({
    communicationMode: commMode,
    configured: wa.status !== "NOT_CONFIGURED",
    killSwitchOff: !wa.canSendReal,
  });
  const emailOperator = operatorChannelLabel({
    communicationMode: commMode,
    configured: em.status !== "NOT_CONFIGURED",
    killSwitchOff: !em.canSendReal,
  });
  const whatsappChannel = await getWhatsAppChannelStatusAction(tenantSlug);

  return (
    <div className="space-y-6" data-phase35="comunicacoes">
      <PageHeader
        title="Comunicações"
        description="Canais, preferências e janela de envio. Sem credenciais na tela."
      />
      <WhatsAppChannelConnect tenantSlug={tenantSlug} initial={whatsappChannel} />
      <CommunicationSettingsForm
        tenantSlug={tenantSlug}
        initial={settings}
        whatsapp={{
          label: wa.label,
          status: wa.status,
          operatorLabel: whatsappOperator,
        }}
        email={{
          label: em.label,
          status: em.status,
          operatorLabel: emailOperator,
        }}
      />
    </div>
  );
}
