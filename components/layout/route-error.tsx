"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  useEffect(() => {
    const payload = {
      level: "error",
      message: "route_error",
      at: new Date().toISOString(),
      context: {
        digest: error.digest,
        name: error.name,
        message: error.message,
      },
    };
    console.error(JSON.stringify(payload));
    if (process.env.NODE_ENV === "development") {
      console.error("[route_error:dev]", error.name, error.message, error.stack);
    }
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
      {error.digest ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Referência: {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={reset} aria-label="Tentar novamente">
          Tentar novamente
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/")}
        >
          Voltar ao início
        </Button>
      </div>
    </div>
  );
}
