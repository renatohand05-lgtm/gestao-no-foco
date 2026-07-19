import { SkeletonCard } from "@/components/ui/skeleton-card";
import { dsSpace } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  cards?: number;
  label?: string;
};

export function RouteLoading({
  cards = 2,
  label = "Carregando…",
}: Props) {
  return (
    <div
      className={cn(dsSpace.section)}
      aria-busy="true"
      aria-label={label}
    >
      {Array.from({ length: cards }).map((_, index) => (
        <SkeletonCard key={index} lines={4} />
      ))}
    </div>
  );
}
