import {
  BarChart3,
  Boxes,
  ClipboardList,
  FileText,
  Landmark,
  Receipt,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

type Module = {
  title: string;
  body: string;
  icon: LucideIcon;
};

const featured: Module[] = [
  {
    title: "Financeiro",
    body: "Caixa, DRE, contas e conciliação no mesmo fluxo — sem planilha paralela.",
    icon: Landmark,
  },
  {
    title: "Vendas",
    body: "Metas, ticket médio e ritmo comercial com visão executiva do dia a dia.",
    icon: TrendingUp,
  },
  {
    title: "CRM",
    body: "Pipeline, relacionamento e retorno de clientes num só lugar.",
    icon: Users,
  },
];

const compact: Module[] = [
  {
    title: "Compras",
    body: "Supply chain, cotações e fornecedores integrados.",
    icon: Truck,
  },
  {
    title: "Estoque",
    body: "Saldos, mínimos e alertas operacionais.",
    icon: Boxes,
  },
  {
    title: "BI",
    body: "Analytics e painéis sem inventar métricas.",
    icon: BarChart3,
  },
  {
    title: "Tributário",
    body: "Obrigações quando houver fonte confiável no tenant.",
    icon: Receipt,
  },
  {
    title: "Importações",
    body: "Catálogo, NF-e e conciliação com governança.",
    icon: FileText,
  },
  {
    title: "IA",
    body: "Regras e histórico do tenant — transparente.",
    icon: Sparkles,
  },
  {
    title: "Relatórios",
    body: "Exportações e leitura consolidada para decisão.",
    icon: ClipboardList,
  },
];

/**
 * Ecossistema de módulos — hierarquia real (3 módulos em destaque + 7
 * compactos) em vez de dez cards idênticos.
 */
export function ModulesSection() {
  return (
    <section
      id="plataforma"
      data-landing-block="modules"
      className="relative border-b border-white/5 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <p className="text-[10px] font-medium tracking-[0.18em] text-[var(--brand-gold)] uppercase">
            Plataforma
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Um ecossistema integrado
          </h2>
          <p className="mt-4 text-[var(--brand-silver)]/80">
            Módulos conectados como centro de comando — não uma lista solta de
            features.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {featured.map((m) => (
            <article
              key={m.title}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[var(--brand-graphite)]/90 to-[var(--brand-navy)]/90 p-6 transition hover:border-[var(--brand-gold)]/50"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--brand-gold)]/12 text-[var(--brand-gold)] transition group-hover:bg-[var(--brand-gold)]/20">
                <m.icon className="size-5" strokeWidth={1.75} aria-hidden />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">
                {m.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                {m.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {compact.map((m) => (
            <article
              key={m.title}
              className="group relative rounded-xl border border-white/10 bg-[var(--brand-navy)]/70 p-4 transition hover:border-[var(--brand-gold)]/35 hover:bg-[var(--brand-graphite)]/70"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-white/5 text-white/60 transition group-hover:text-[var(--brand-gold)]">
                <m.icon className="size-4" strokeWidth={1.75} aria-hidden />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-white">
                {m.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/50">
                {m.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
