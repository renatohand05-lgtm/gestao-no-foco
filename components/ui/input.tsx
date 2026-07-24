import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { gofControl } from "@/lib/design-system/primitives";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(gofControl, "file:mr-2 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground md:text-sm dark:bg-input/30", className)}
      {...props}
    />
  );
}

export { Input };
