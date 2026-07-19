"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dsElevation, dsPadding, dsSpace, dsType } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
};

export function RouteError({
  error,
  reset,
  title = "Algo deu errado",
  description = "Não foi possível carregar esta página. Tente novamente.",
}: Props) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        message: "route_error",
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
    <div
      className={cn(
        "mx-auto flex max-w-lg flex-col items-center text-center",
        dsSpace.section,
        dsElevation.empty,
        dsPadding.empty,
      )}
      role="alert"
    >
      <AlertCircle className="size-10 text-destructive" aria-hidden />
      <h2 className={cn("mt-4", dsType.sectionTitle)}>{title}</h2>
      <p className={cn("mt-2", dsType.description)}>{description}</p>
      <Button type="button" className="mt-6" onClick={reset} aria-label="Tentar novamente">
        Tentar novamente
      </Button>
    </div>
  );
}
