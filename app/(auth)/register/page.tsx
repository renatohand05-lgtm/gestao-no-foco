import { Suspense } from "react";

import { RegisterForm } from "@/components/auth/register-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Criar conta",
};

function RegisterFormFallback() {
  return <Skeleton className="h-[560px] w-full rounded-xl" />;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFormFallback />}>
      <RegisterForm />
    </Suspense>
  );
}
