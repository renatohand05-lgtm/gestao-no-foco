import type { Metadata } from "next";

import { CtaSection } from "@/components/marketing/cta-section";
import { DashboardPreviewSection } from "@/components/marketing/dashboard-preview-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { IntelligenceSection } from "@/components/marketing/intelligence-section";
import { ModulesSection } from "@/components/marketing/modules-section";
import { SegmentsSection } from "@/components/marketing/segments-section";
import { ValueSection } from "@/components/marketing/value-section";
import { brandConfig } from "@/config/brand";

export const metadata: Metadata = {
  title: `${brandConfig.legalName} — ${brandConfig.subtitle}`,
  description:
    "Controle total da sua empresa em uma única plataforma. Financeiro, vendas, estoque, CRM, compras, BI e inteligência empresarial conectados.",
  openGraph: {
    title: `${brandConfig.legalName} — ${brandConfig.subtitle}`,
    description: brandConfig.positioning,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: brandConfig.legalName,
    description: brandConfig.positioning,
  },
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <ModulesSection />
      <DashboardPreviewSection />
      <IntelligenceSection />
      <SegmentsSection />
      <ValueSection />
      <CtaSection />
    </>
  );
}
