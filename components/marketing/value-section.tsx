const values = [
  {
    title: "Menos retrabalho",
    body: "Cadastros e operações conectados — menos planilhas paralelas.",
  },
  {
    title: "Maior controle",
    body: "Visão única de caixa, vendas e estoque no mesmo shell.",
  },
  {
    title: "Decisões mais rápidas",
    body: "Prioridades e alertas com origem e confiança explícitas.",
  },
  {
    title: "Visão consolidada",
    body: "Centro de comando executivo após o login — sem telas soltas.",
  },
  {
    title: "Redução de erros",
    body: "Estados Indisponível quando não há dado — nunca inventamos.",
  },
  {
    title: "Previsibilidade de caixa",
    body: "Horizontes e saúde financeira baseados no histórico do tenant.",
  },
] as const;

/**
 * Prova de valor qualitativa — sem inventar métricas (Sprint 25.5.2).
 */
export function ValueSection() {
  return (
    <section
      data-landing-block="value"
      className="relative border-b border-white/5 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-[10px] font-medium tracking-[0.18em] text-[var(--brand-gold)] uppercase">
            Valor
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Benefícios que você sente na operação
          </h2>
          <p className="mt-4 text-[var(--brand-silver)]/80">
            Indicadores institucionais qualitativos — sem inventar clientes,
            faturamento ou percentuais de crescimento.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((v) => (
            <article
              key={v.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <h3 className="text-base font-semibold text-white">{v.title}</h3>
              <p className="mt-2 text-sm text-white/60">{v.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
