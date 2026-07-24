import { Loader2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type ButtonProps = React.ComponentProps<typeof Button> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

/**
 * ExecutiveButton — estados loading / disabled / focus / hover (Gate 19.0.2).
 * `variant="destructive"` = Danger.
 */
export function ExecutiveButton({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Button
      variant={variant}
      size={size}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "gap-2",
        loading && "cursor-wait",
        className,
      )}
      {...props}
    >
      {loading ? (
        <DsIcon
          icon={Loader2}
          size="sm"
          className="animate-spin"
          label="Carregando"
        />
      ) : null}
      {children}
    </Button>
  );
}
