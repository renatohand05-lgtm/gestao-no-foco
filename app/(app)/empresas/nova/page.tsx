import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { requireAuth } from "@/lib/tenants";

export const metadata = {
  title: "Nova empresa",
};

/**
 * Criação de empresa adicional (mesma conta, novo tenant + membership OWNER).
 * Não redireciona quem já tem memberships (diferente de /onboarding).
 */
export default async function NovaEmpresaPage() {
  await requireAuth();

  return <OnboardingForm mode="additional" />;
}
