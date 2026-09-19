import { requireAuth } from "@/lib/tenants";
import { isPlatformOwner } from "@/lib/platform/platform-access-service";
import { WhatsAppDiagnosticsPanel } from "@/components/master/whatsapp-diagnostics-panel";

export const metadata = { title: "WhatsApp Business · Gestão no Foco" };
export const dynamic = "force-dynamic";

export default async function WhatsAppDiagnosticsPage() {
  await requireAuth();
  const isOwner = await isPlatformOwner();

  if (!isOwner) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-xl font-semibold text-foreground">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">
          Esta área é exclusiva do dono da plataforma.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">WhatsApp Business</h1>
        <p className="text-sm text-muted-foreground">
          Diagnóstico e registro do número configurado no Meta Cloud API —
          use isto pra terminar de ativar o WhatsApp de ponta a ponta.
        </p>
      </div>
      <WhatsAppDiagnosticsPanel />
    </div>
  );
}
