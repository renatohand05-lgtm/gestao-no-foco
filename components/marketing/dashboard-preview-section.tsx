import { LandingDashboardPreview } from "@/components/marketing/landing-dashboard-preview";

/**
 * Prévia ampliada do dashboard aprovado (Sprint 25.5.2).
 */
export function DashboardPreviewSection() {
  return (
    <section
      id="preview"
      data-landing-block="preview-full"
      className="relative border-b border-white/5 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-[10px] font-medium tracking-[0.18em] text-[var(--brand-gold)] uppercase">
            Experiência
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            O mesmo cockpit que você vê após o login
          </h2>
          <p className="mt-4 text-[var(--brand-silver)]/80">
            KPIs, gráfico, Central de Inteligência, fluxo de caixa, alertas e
            IA — continuidade visual com splash, login e sidebar.
          </p>
        </div>
        <LandingDashboardPreview />
      </div>
    </section>
  );
}
