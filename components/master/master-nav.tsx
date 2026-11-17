"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Gift,
  LayoutDashboard,
  LifeBuoy,
  MessageCircle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Gradiente do chip do ícone (mesma paleta do menu lateral do portal). */
  chip: [string, string];
  ownerOnly?: boolean;
};

const ITEMS: Item[] = [
  { href: "/master/dashboard", label: "Dashboard", icon: LayoutDashboard, chip: ["#ff453a", "#ff6b5c"] },
  { href: "/master/empresas", label: "Empresas", icon: Building2, chip: ["#0a84ff", "#4fb3ff"] },
  { href: "/master/suporte", label: "Suporte", icon: LifeBuoy, chip: ["#64d2ff", "#8fe0ff"], ownerOnly: true },
  { href: "/master/convites", label: "Convites", icon: Gift, chip: ["#ff9f0a", "#ffc04d"], ownerOnly: true },
  { href: "/master/plano-preview", label: "Simulador de planos", icon: Sparkles, chip: ["#5e5ce6", "#8e8cff"] },
  { href: "/master/whatsapp", label: "WhatsApp", icon: MessageCircle, chip: ["#30d158", "#66e08a"], ownerOnly: true },
];

export function MasterNav({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Área master"
      className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {ITEMS.filter((item) => isOwner || !item.ownerOnly).map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-[var(--brand-gold,#f8c208)]/30 bg-gradient-to-r from-[rgb(248_194_8/0.16)] to-[rgb(248_194_8/0.03)] text-foreground"
                : "border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground",
            )}
          >
            <span
              className="inline-flex size-6 items-center justify-center rounded-lg text-white shadow-sm"
              style={{ background: `linear-gradient(145deg, ${item.chip[0]}, ${item.chip[1]})` }}
            >
              <Icon className="size-3.5" aria-hidden />
            </span>
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
