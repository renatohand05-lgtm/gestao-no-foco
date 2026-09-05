import Link from "next/link";
import { Building2, LayoutDashboard, LifeBuoy, Sparkles } from "lucide-react";

import { SupportNotificationBell } from "@/components/master/support-notification-bell";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/tenants";

const NAV_ITEMS = [
  { href: "/master/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/master/empresas", label: "Empresas", icon: Building2 },
  { href: "/master/suporte", label: "Suporte", icon: LifeBuoy },
  { href: "/master/plano-preview", label: "Simulador de planos", icon: Sparkles },
] as const;

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
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.filter((item) => isOwner || item.href !== "/master/suporte").map(
              (item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ),
            )}
          </nav>
          {isOwner ? <SupportNotificationBell /> : null}
        </div>
      </header>
      {children}
    </div>
  );
}
