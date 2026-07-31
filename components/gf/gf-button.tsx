import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<typeof Button> &
  VariantProps<typeof buttonVariants>;

/**
 * Botão com assinatura visual — wrapper fino sobre Button existente.
 */
export function GFButton({ className, ...props }: ButtonProps) {
  return (
    <Button
      data-gf-button=""
      className={cn(
        "gf-button shadow-none transition-[transform,box-shadow,background-color]",
        "duration-[var(--gf-motion-micro)] ease-[var(--gf-ease)]",
        className,
      )}
      {...props}
    />
  );
}
