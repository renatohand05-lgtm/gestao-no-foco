import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type LoadingStateProps = {
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClassName = {
  sm: "py-8",
  md: "py-16",
  lg: "py-24",
};

export function LoadingState({
  label = "Carregando...",
  className,
  size = "md",
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground",
        sizeClassName[size],
        className,
      )}
    >
      <Loader2 className="size-6 animate-spin text-primary" />
      <p>{label}</p>
    </div>
  );
}
