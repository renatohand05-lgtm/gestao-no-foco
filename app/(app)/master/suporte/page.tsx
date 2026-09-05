import { SupportInboxClient } from "@/components/master/support-inbox-client";
import { createClient } from "@/lib/supabase/server";
import { listTicketsForOwner } from "@/lib/support/support-service";
import { requireAuth } from "@/lib/tenants";

export const metadata = { title: "Central de Suporte · Gestão no Foco" };
export const dynamic = "force-dynamic";

export default async function MasterSuportePage() {
  const user = await requireAuth();
  const client = await createClient();

  const { data: partnerRow } = await client
    .from("platform_partners" as never)
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<{ role: string }>();

  if (!partnerRow || partnerRow.role !== "owner") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-3 text-center px-4">
        <h1 className="text-xl font-semibold text-foreground">
          Acesso restrito
        </h1>
        <p className="text-sm text-muted-foreground">
          A central de suporte é exclusiva do dono da plataforma.
        </p>
      </div>
    );
  }

  const tickets = await listTicketsForOwner(client);

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">
          Central de Suporte
        </h1>
        <p className="text-sm text-muted-foreground">
          Solicitações de ajuda de todas as empresas, em um só lugar.
        </p>
      </header>
      <SupportInboxClient initialTickets={tickets} />
    </div>
  );
}
