import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { getPostLoginPath } from "@/lib/auth/redirect";
import { requireAuth } from "@/lib/tenants";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Configurar empresa",
};

export default async function OnboardingPage() {
  const user = await requireAuth();
  const supabase = await createClient();
  const destination = await getPostLoginPath(supabase, user.id);

  if (destination !== "/onboarding") {
    redirect(destination);
  }

  return <OnboardingForm />;
}
