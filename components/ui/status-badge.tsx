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
  success: "success",
  warning: "warning",
  danger: "destructive",
  secondary: "secondary",
  outline: "outline",
};

export function StatusBadge({
  label,
  variant = "default",
  className,
}: StatusBadgeProps) {
  return (
    <Badge variant={variantMap[variant]} className={cn(className)}>
      {label}
    </Badge>
  );
}
