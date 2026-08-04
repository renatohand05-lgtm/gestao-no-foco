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

/** Remove padrões que possam vazar credenciais/PII de mensagens técnicas. */
function sanitizeErrorText(value: unknown, max = 240): string {
  return String(value ?? "")
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "[redacted]")
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, "[redacted-jwt]")
    .replace(/(password|passwd|secret|token|cookie|authorization)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[redacted-id]")
    .slice(0, max);
}

export function RouteError({
  error,
  reset,
  title = "Algo deu errado",
  description = "Não foi possível carregar esta página. Tente novamente.",
}: Props) {
  const router = useRouter();

  useEffect(() => {
    // Produção: só digest + nome sanitizado — sem stack, cookies ou PII na UI/storage.
    const payload = {
      level: "error",
      message: "route_error",
      at: new Date().toISOString(),
      context: {
        digest: error.digest ?? null,
        name: sanitizeErrorText(error.name, 80),
      },
    };
    console.error(JSON.stringify(payload));

    try {
      sessionStorage.setItem(
        "gof:last-route-error",
        JSON.stringify({
          at: payload.at,
          digest: payload.context.digest,
          name: payload.context.name,
        }),
      );
    } catch {
      // storage indisponível — ignore
    }

    if (process.env.NODE_ENV === "development") {
      console.error(
        "[route_error:dev]",
        error.name,
        sanitizeErrorText(error.message, 500),
      );
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
