import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  Landmark,
  Receipt,
  Sparkles,
  Tags,
  Target,
  Wallet,
} from "lucide-react";

import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  FINANCEIRO_HUB_ITEMS,
  FINANCEIRO_ROADMAP_ITEMS,
} from "@/lib/financeiro/constants";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Financeiro" };

const ICONS = {
  "plano-contas": BookOpen,
  "centros-custo": Target,
  "contas-bancarias": Landmark,
  "formas-pagamento": CreditCard,
  categorias: Tags,
  "contas-receber": Receipt,
  "contas-pagar": Wallet,
} as const;

export default async function FinanceiroPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  return (
    <div className="space-y-8">
      <ModuleHeader
        title="Financeiro"
        description={`Base estrutural e cadastros mestres de ${tenant.name}`}
        breadcrumbs={[{ label: "Financeiro" }]}
      />

      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-6 py-10 text-white shadow-sm md:px-10">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 size-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/80">
            Estrutura financeira
          </p>
          <h2 className="font-serif text-3xl tracking-tight md:text-4xl">
            Cadastros mestres prontos para operação financeira.
          </h2>
          <p className="text-sm text-slate-200/85 md:text-base">
            Configure plano de contas, centros de custo, bancos, formas de
            pagamento e categorias. Os módulos operacionais entram na sequência
            planejada do roadmap.
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {FINANCEIRO_HUB_ITEMS.map((item) => {
          const Icon = ICONS[item.href as keyof typeof ICONS];
          return (
            <Link
              key={item.href}
              href={`/${tenantSlug}/financeiro/${item.href}`}
              className="group"
            >
              <SectionCard
                title={item.title}
                description={item.description}
                contentClassName="pt-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-muted/40">
                    <Icon className="size-5 text-foreground/80" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 transition group-hover:gap-2 dark:text-emerald-300">
                    {item.cta}
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </SectionCard>
            </Link>
          );
        })}
      </div>

      <SectionCard
        title="Roadmap financeiro"
        description="Próximas entregas já planejadas sobre esta base estrutural."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {FINANCEIRO_ROADMAP_ITEMS.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border/60 bg-muted/20 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                </div>
                <StatusBadge label={item.phase} variant="secondary" />
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
