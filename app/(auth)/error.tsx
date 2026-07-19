"use client";

import { RouteError } from "@/components/layout/route-error";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto min-h-[50vh] px-4 py-16">
      <RouteError
        error={error}
        reset={reset}
        title="Erro de autenticação"
        description="Não foi possível carregar esta tela. Tente novamente."
      />
    </main>
  );
}
