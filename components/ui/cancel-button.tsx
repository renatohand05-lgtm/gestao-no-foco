"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CancelButtonProps = React.ComponentProps<typeof Button> & {
  label?: string;
};

export function CancelButton({
  label = "Cancelar",
  variant = "outline",
  type = "button",
  className,
  ...props
}: CancelButtonProps) {
  return (
    <Button
      type={type}
      variant={variant}
      className={cn(className)}
      {...props}
    >
      {label}
    </Button>
  );
}
