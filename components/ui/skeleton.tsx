import { cn } from "@/lib/utils"
import { dsRadius } from "@/lib/design-system"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse bg-muted", dsRadius.sm, className)}
      {...props}
    />
  )
}

export { Skeleton }
