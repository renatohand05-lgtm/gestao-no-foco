import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { BrandSplash } from "@/components/brand";
import { brandConfig } from "@/config/brand";

export const metadata = {
  title: "Entrar",
  description: brandConfig.subtitle,
};

function LoginFormFallback() {
  return (
    <BrandSplash
      className="min-h-[28rem] rounded-xl border border-border/50"
      label="Preparando acesso…"
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
