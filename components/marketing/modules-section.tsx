const modules = [
  {
    title: "Financeiro",
    body: "Caixa, DRE, contas e conciliação no mesmo fluxo.",
  },
  {
    title: "Vendas",
    body: "Metas, ticket e ritmo comercial com visão executiva.",
  },
  {
    title: "Compras",
    body: "Supply chain, cotações e fornecedores integrados.",
  },
  {
    title: "Estoque",
    body: "Saldos, mínimos e alertas operacionais.",
  },
  {
    title: "CRM",
    body: "Pipeline, relacionamento e retorno de clientes.",
  },
  {
    title: "BI",
    body: "Analytics e painéis sem inventar métricas.",
  },
  {
    title: "Tributário",
    body: "Obrigações quando houver fonte confiável no tenant.",
  },
  {
    title: "Importações",
    body: "Catálogo, NF-e e conciliação com governança.",
  },
  {
    title: "IA",
    body: "Regras e histórico do tenant — transparente.",
  },
  {
    title: "Relatórios",
    body: "Exportações e leitura consolidada para decisão.",
  },
] as const;

/**
 * Ecossistema de módulos — cards conectados (Sprint 25.5.2).
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

        <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div
            className="pointer-events-none absolute inset-x-8 top-1/2 hidden h-px bg-gradient-to-r from-transparent via-[var(--brand-gold)]/25 to-transparent lg:block"
            aria-hidden
          />
          {modules.map((m) => (
            <article
              key={m.title}
              className="relative rounded-2xl border border-white/10 bg-[var(--brand-navy)]/80 p-4 transition hover:border-[var(--brand-gold)]/40 hover:bg-[var(--brand-graphite)]/80"
            >
              <h3 className="text-sm font-semibold text-white">{m.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-white/55">
                {m.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
