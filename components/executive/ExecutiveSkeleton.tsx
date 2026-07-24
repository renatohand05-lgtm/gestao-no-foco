import { cn } from "@/lib/utils";
import { gofMotion, gofRadius } from "@/lib/design-system/foundation";
import {
  gofCardPadding,
  gofCardSurface,
} from "@/lib/design-system/primitives";

type Props = {
  className?: string;
  widthClassName?: string;
  heightClassName?: string;
  rounded?: keyof typeof gofRadius;
};

/**
 * ExecutiveSkeleton — shimmer ≤1.6s cycle (Gate 19.0.2).
 */
export function ExecutiveSkeleton({
  className,
  widthClassName = "w-full",
  heightClassName = "h-4",
  rounded = "md",
}: Props) {
  return (
    <div
      className={cn(
        gofMotion.skeleton,
        gofRadius[rounded],
        widthClassName,
        heightClassName,
        className,
      )}
      aria-hidden
    />
  );
}

type BlockProps = {
  lines?: number;
  className?: string;
};

export function ExecutiveSkeletonBlock({ lines = 3, className }: BlockProps) {
  return (
    <div
      className={cn("space-y-3", className)}
      aria-busy="true"
      aria-label="Carregando"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <ExecutiveSkeleton
          key={i}
          widthClassName={i === lines - 1 ? "w-2/3" : "w-full"}
          heightClassName={i === 0 ? "h-5" : "h-4"}
        />
      ))}
    </div>
  );
}

type CardProps = {
  className?: string;
};

export function ExecutiveSkeletonCard({ className }: CardProps) {
  return (
    <div
      className={cn(gofCardSurface, gofCardPadding, "space-y-4", className)}
      aria-busy="true"
      aria-label="Carregando card"
    >
      <ExecutiveSkeleton widthClassName="w-1/3" heightClassName="h-3" />
      <ExecutiveSkeleton widthClassName="w-1/2" heightClassName="h-8" />
      <ExecutiveSkeleton widthClassName="w-full" heightClassName="h-3" />
    </div>
  );
}
