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

type DeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  loadingLabel?: string;
  error?: string | null;
  onConfirm: () => void;
};

export function DeleteDialog({
  open,
  onOpenChange,
  title = "Confirmar exclusão",
  description,
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  loading = false,
  loadingLabel = "Excluindo...",
  error,
  onConfirm,
}: DeleteDialogProps) {
  const isPlainText =
    typeof description === "string" || typeof description === "number";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (loading && !next) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent aria-busy={loading}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {isPlainText ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : (
            <>
              <AlertDialogDescription className="sr-only">
                {title}
              </AlertDialogDescription>
              <div
                className={cn(
                  "w-full text-left text-sm text-muted-foreground",
                )}
              >
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
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {loading ? loadingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
