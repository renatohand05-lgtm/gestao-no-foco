import * as React from "react";

import { gofControlTextarea } from "@/lib/design-system/primitives";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(gofControlTextarea, "md:text-sm dark:bg-input/30", className)}
      {...props}
    />
  );
}

export { Textarea };
