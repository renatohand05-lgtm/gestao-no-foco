import * as React from "react";

import { gofControl } from "@/lib/design-system/primitives";
import { cn } from "@/lib/utils";

/**
 * Select nativo com fallback themed (Sprint 27.8).
 * Preferir GFSelect em áreas críticas; usar este wrapper quando nativo for necessário.
 */
export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select"> & { invalid?: boolean }
>(function NativeSelect(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      data-slot="native-select"
      aria-invalid={invalid || undefined}
      className={cn(
        gofControl,
        "dark:bg-input/30",
        "gof-native-select appearance-auto",
        invalid && "border-destructive ring-2 ring-destructive/25",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
