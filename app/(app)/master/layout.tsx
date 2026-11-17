import { BrandMark } from "@/components/brand/brand-mark";
import { MasterNav } from "@/components/master/master-nav";
import { SupportNotificationBell } from "@/components/master/support-notification-bell";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/tenants";

export default async function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const client = await createClient();
  const { data: partnerRow } = await client
    .from("platform_partners" as never)
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<{ role: string }>();

  if (!partnerRow) {
    return <>{children}</>;
  }

  const isOwner = partnerRow.role === "owner";

  return (
    // Sem fundo opaco: a aurora e o G da marca (PortalBackdrop) aparecem por trás.
    <div className="min-h-svh">
      <header className="sticky top-0 z-30 border-b border-border bg-sidebar backdrop-blur-xl [backdrop-filter:saturate(180%)_blur(30px)]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:gap-5 sm:px-6 lg:px-8">
          <div className="flex shrink-0 items-center gap-2.5">
            <BrandMark size="lg" className="rounded-xl" />
            <div className="hidden leading-none sm:block">
              <p className="text-sm font-bold tracking-[0.22em] text-foreground">GESTÃO</p>
              <p className="mt-1 text-[10px] tracking-wide text-muted-foreground">
                {isOwner ? "Visão master" : "Painel do associado"}
              </p>
            </div>
          </div>
          <div className="hidden h-7 w-px shrink-0 bg-border sm:block" aria-hidden />
          <div className="min-w-0 flex-1">
            <MasterNav isOwner={isOwner} />
          </div>
          {isOwner ? <SupportNotificationBell /> : null}
        </div>
      </header>
      {children}
    </div>
  );
}
