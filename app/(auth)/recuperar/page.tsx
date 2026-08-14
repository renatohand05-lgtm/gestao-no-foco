import { Suspense } from "react";

import { RecoverPasswordForm } from "@/components/auth/recover-password-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Recuperar acesso",
};

function RecoverFallback() {
  return <Skeleton className="h-[420px] w-full rounded-xl" />;
}

export default function RecuperarPage() {
  return (
    <Suspense fallback={<RecoverFallback />}>
      <RecoverPasswordForm />
    </Suspense>
  );
}
