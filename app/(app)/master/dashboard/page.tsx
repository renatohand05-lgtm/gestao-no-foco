import { MasterDashboardView } from "@/components/master/master-dashboard-view";
import { getPlatformAccess } from "@/lib/platform/platform-access-service";
import { requireAuth } from "@/lib/tenants";

export const metadata = { title: "Visão do Dono · Gestão no Foco" };

export default async function MasterDashboardPage() {
  await requireAuth();
  const access = await getPlatformAccess();

  if (!access) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-xl font-semibold text-foreground">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">
          Esta área é exclusiva do dono da plataforma e de associados autorizados.
          Sua conta não tem esse acesso.
        </p>
      </div>
    );
  }

  return <MasterDashboardView access={access} />;
}
