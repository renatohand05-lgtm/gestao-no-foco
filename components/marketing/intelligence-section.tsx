const signals = [
  {
    title: "Risco de caixa",
    body: "Projeções e saúde de saldo com origem no cockpit financeiro.",
  },
  {
    title: "Margem",
    body: "Leitura de contribuição e DRE quando a base estiver disponível.",
  },
  {
    title: "Estoque",
    body: "Alertas de mínimo e ruptura a partir do ledger operacional.",
  },
  {
    title: "Clientes",
    body: "OS em aberto, atrasos e retorno — sem inventar CRM.",
  },
  {
    title: "Tributos",
    body: "Obrigações só quando houver fonte confiável no ciclo.",
  },
  {
    title: "Oportunidades",
    body: "Potencial comercial e prioridades do dia com confiança explícita.",
  },
] as const;

/**
 * Seção de inteligência determinística (Sprint 25.5.2).
 */
export function IntelligenceSection() {
  return (
    <section
      id="inteligencia"
      data-landing-block="intelligence"
      className="relative border-b border-white/5 py-20 sm:py-24"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.08),transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-[10px] font-medium tracking-[0.18em] text-[var(--brand-gold)] uppercase">
            Inteligência
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Decisões melhores, antes que os problemas aconteçam.
          </h2>
          <p className="mt-4 text-[var(--brand-silver)]/80">
            A plataforma transforma dados operacionais em decisões. Análise
            baseada em regras, métricas e histórico do tenant — sem prometer IA
            externa não configurada.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {signals.map((s) => (
            <article
              key={s.title}
              className="rounded-2xl border border-white/10 bg-[var(--brand-graphite)]/60 p-5 transition hover:border-[var(--brand-gold)]/30"
            >
              <h3 className="text-base font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                {s.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
