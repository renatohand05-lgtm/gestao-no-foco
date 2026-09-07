import { FreeAccessInvitesClient } from "@/components/master/free-access-invites-client";
import { listFreeAccessInvites } from "@/lib/platform/free-access";
import { isPlatformOwner } from "@/lib/platform/platform-access-service";
import { requireAuth } from "@/lib/tenants";

export const metadata = { title: "Convites de acesso gratuito · Gestão no Foco" };
export const dynamic = "force-dynamic";

export default async function MasterConvitesPage() {
  await requireAuth();
  const isOwner = await isPlatformOwner();

  if (!isOwner) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-3 text-center px-4">
        <h1 className="text-xl font-semibold text-foreground">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">
          Convites de acesso gratuito são exclusivos do dono da plataforma.
        </p>
      </div>
    );
  }

  const result = await listFreeAccessInvites();

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">
          Convites de acesso gratuito
        </h1>
        <p className="text-sm text-muted-foreground">
          Gere um link de uso único pra alguém entrar sem precisar de
          assinatura ativa. Ideal pra beta testers ou parceiros — nunca é
          liberado sem você gerar o link primeiro.
        </p>
      </header>
      <FreeAccessInvitesClient
        initialInvites={result.success ? result.data : []}
      />
    </div>
  );
}
