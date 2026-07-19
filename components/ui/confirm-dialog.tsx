"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  /** Ampliar diálogo quando há formulário embutido. */
  wide?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  loading = false,
  error,
  onConfirm,
  wide = false,
}: ConfirmDialogProps) {
  const isPlainText =
    typeof description === "string" || typeof description === "number";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          wide &&
            "max-w-[calc(100%-2rem)] data-[size=default]:max-w-lg data-[size=default]:sm:max-w-lg",
        )}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {isPlainText ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : (
            <>
              <AlertDialogDescription className="sr-only">
                {title}
              </AlertDialogDescription>
              <div className="w-full text-left text-sm text-muted-foreground">
                {description}
              </div>
            </>
          )}
        </AlertDialogHeader>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              if (!loading) onConfirm();
            }}
            disabled={loading}
          >
            {loading ? "Processando..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
