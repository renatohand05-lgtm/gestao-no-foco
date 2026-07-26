"use client";

import Link from "next/link";
import { ShieldOff } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import { gofMotion, gofRadius, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type AccessDeniedProps = {
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

/**
 * Estado premium de acesso negado.
 * Mensagem clara · sem expor regras internas · acessível.
 */
export function AccessDenied({
  title = "Acesso não permitido",
  description = "Você não tem permissão para visualizar este conteúdo. Se acredita que isso é um engano, fale com o administrador da empresa.",
  actionHref,
  actionLabel = "Voltar",
  onAction,
  className,
}: AccessDeniedProps) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-security-state="access-denied"
      className={cn(
        "flex w-full flex-col items-center justify-center gap-4 px-4 py-10 text-center sm:py-14",
        gofMotion.fade,
        className,
      )}
    >
      <div
        className={cn(
          "flex size-14 items-center justify-center bg-muted text-muted-foreground ring-1 ring-border/60",
          gofRadius.lg,
        )}
        aria-hidden
      >
        <DsIcon icon={ShieldOff} size="lg" />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className={cn(gofTypography.title, "text-lg sm:text-xl")}>
          {title}
        </h2>
        <p className={cn(gofTypography.subtitle, "text-sm sm:text-[15px]")}>
          {description}
        </p>
      </div>
      {actionHref || onAction ? (
        actionHref ? (
          <Link
            href={actionHref}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "focus-visible:ring-2",
            )}
          >
            {actionLabel}
          </Link>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="focus-visible:ring-2"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )
      ) : null}
    </section>
  );
}
