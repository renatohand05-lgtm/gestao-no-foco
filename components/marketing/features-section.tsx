import {
  Gauge,
  LineChart,
  Shield,
  Target,
  type LucideIcon,
} from "lucide-react";

const pillars: Array<{
  icon: LucideIcon;
  title: string;
  body: string;
}> = [
  {
    icon: Gauge,
    title: "Controle Total",
    body: "Operação, financeiro e estoque no mesmo centro de comando — com isolamento por empresa.",
  },
  {
    icon: LineChart,
    title: "Decisões Inteligentes",
    body: "Insights determinísticos com origem, período e confiança. Sem fingir IA externa.",
  },
  {
    icon: Target,
    title: "Resultados Reais",
    body: "KPIs, fluxo de caixa e metas conectados aos dados do tenant — nunca números inventados.",
  },
  {
    icon: Shield,
    title: "Segurança e Confiança",
    body: "RBAC, auditoria e fronteiras de tenant para decisões executivas com responsabilidade.",
  },
];

/**
 * Pilares institucionais — cards premium (Sprint 25.5.2).
 */
export function FeaturesSection() {
  return (
    <section
      id="recursos"
      data-landing-block="pillars"
      className="relative border-b border-white/5 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-[10px] font-medium tracking-[0.18em] text-[var(--brand-gold)] uppercase">
            Pilares
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Gestão com profundidade executiva
          </h2>
          <p className="mt-4 text-[var(--brand-silver)]/80">
            Identidade premium alinhada ao splash, login e dashboard — sem
            aparência de template.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {pillars.map((p) => (
            <article
              key={p.title}
              className="group rounded-2xl border border-white/10 bg-[var(--brand-graphite)]/70 p-5 shadow-[0_12px_40px_-24px_rgb(0_0_0_/0.8)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--brand-gold)]/35 hover:shadow-[0_0_32px_rgb(201_168_76_/0.12)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl border border-[var(--brand-gold)]/25 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] transition group-hover:bg-[var(--brand-gold)]/20">
                <p.icon className="size-5" aria-hidden />
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                {p.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
