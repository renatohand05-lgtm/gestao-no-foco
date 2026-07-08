import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusBadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "secondary"
  | "outline";

type StatusBadgeProps = {
  label: string;
  variant?: StatusBadgeVariant;
  className?: string;
};

const variantMap: Record<
  StatusBadgeVariant,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  default: "default",
  success: "default",
  warning: "outline",
  danger: "destructive",
  secondary: "secondary",
  outline: "outline",
};

const variantClassName: Record<StatusBadgeVariant, string> = {
  default: "",
  success: "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400",
  warning: "border-amber-500/30 text-amber-700 dark:text-amber-400",
  danger: "",
  secondary: "",
  outline: "",
};

export function StatusBadge({
  label,
  variant = "default",
  className,
}: StatusBadgeProps) {
  return (
    <Badge
      variant={variantMap[variant]}
      className={cn(variantClassName[variant], className)}
    >
      {label}
    </Badge>
  );
}
