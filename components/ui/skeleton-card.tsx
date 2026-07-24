import { ExecutiveSkeletonBlock } from "@/components/executive/ExecutiveSkeleton";
import {
  gofCardPadding,
  gofCardSurface,
} from "@/lib/design-system/primitives";
import { cn } from "@/lib/utils";

type SkeletonCardProps = {
  lines?: number;
  className?: string;
};

/**
 * Compat wrapper — Suspense de bloco usa ExecutiveSkeleton* (Gate 19.6).
 * Rotas continuam em BrandSplash via loading.tsx / RouteLoading.
 */
export function SkeletonCard({ lines = 3, className }: SkeletonCardProps) {
  return (
    <div
      className={cn(gofCardSurface, gofCardPadding, className)}
      aria-busy="true"
      aria-label="Carregando"
    >
      <ExecutiveSkeletonBlock lines={lines} />
    </div>
  );
}
