import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { PremiumGlobalLoader } from "@/components/brand";
import { brandConfig } from "@/config/brand";

export const metadata = {
  title: "Entrar",
  description: brandConfig.subtitle,
};

function LoginFormFallback() {
  return (
    <PremiumGlobalLoader
      className="min-h-[28rem] rounded-xl border border-white/10"
      label="Carregando conteúdo"
    />
  );
}

export default function LoginPage() {
  return (
    <div data-brand-continuity="login" data-sprint="26.1">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
