import { CtaSection } from "@/components/marketing/cta-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { SegmentsSection } from "@/components/marketing/segments-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <SegmentsSection />
      <CtaSection />
    </>
  );
}
