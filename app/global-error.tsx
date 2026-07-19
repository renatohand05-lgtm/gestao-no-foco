"use client";

import { useEffect } from "react";

import { RouteError } from "@/components/layout/route-error";

/**
 * Erro no root layout — precisa do próprio html/body (Next.js).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        message: "global_error",
        at: new Date().toISOString(),
        context: {
          digest: error.digest,
          name: error.name,
          message: error.message,
        },
      }),
    );
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-full bg-background text-foreground antialiased">
        <main className="mx-auto flex min-h-screen items-center px-4 py-16">
          <RouteError
            error={error}
            reset={reset}
            title="Erro interno (500)"
            description="Ocorreu uma falha inesperada na aplicação. Tente novamente. Se persistir, contate o suporte."
          />
        </main>
      </body>
    </html>
  );
}
