import { Suspense } from "react";

import { NewPasswordForm } from "@/components/auth/new-password-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Nova senha",
};

function NovaSenhaFallback() {
  return <Skeleton className="h-[480px] w-full rounded-xl" />;
}

export default function NovaSenhaPage() {
  return (
    <Suspense fallback={<NovaSenhaFallback />}>
      <NewPasswordForm />
    </Suspense>
  );
}
