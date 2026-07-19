"use client";

import { RouteError } from "@/components/layout/route-error";

export default function TenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Erro na área da empresa"
      description="Não foi possível carregar este módulo. Tente novamente."
    />
  );
}
