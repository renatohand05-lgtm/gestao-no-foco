"use client";

import Link from "next/link";
import {
  Eye,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActionType = "create" | "edit" | "delete" | "view";

type ActionButtonProps = {
  action: ActionType;
  label?: string;
  href?: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  size?: React.ComponentProps<typeof Button>["size"];
};

const actionConfig: Record<
  ActionType,
  { label: string; icon: LucideIcon; variant: React.ComponentProps<typeof Button>["variant"] }
> = {
  create: { label: "Novo", icon: Plus, variant: "default" },
  edit: { label: "Editar", icon: Pencil, variant: "outline" },
  delete: { label: "Excluir", icon: Trash2, variant: "destructive" },
  view: { label: "Ver detalhes", icon: Eye, variant: "outline" },
};

export function ActionButton({
  action,
  label,
  href,
  onClick,
  loading = false,
  disabled = false,
  className,
  size = "default",
}: ActionButtonProps) {
  const config = actionConfig[action];
  const Icon = config.icon;
  const text = label ?? config.label;

  const content = loading ? (
    <>
      <Loader2 className="mr-2 size-4 animate-spin" />
      Processando...
    </>
  ) : (
    <>
      <Icon className="mr-2 size-4" />
      {text}
    </>
  );

  if (href) {
    const isDisabled = disabled || loading;

    return (
      <Link
        href={href}
        aria-disabled={isDisabled}
        tabIndex={isDisabled ? -1 : undefined}
        className={cn(
          buttonVariants({ variant: config.variant, size }),
          isDisabled && "pointer-events-none opacity-50",
          className,
        )}
        onClick={isDisabled ? (event) => event.preventDefault() : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <Button
      variant={config.variant}
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(className)}
    >
      {content}
    </Button>
  );
}
