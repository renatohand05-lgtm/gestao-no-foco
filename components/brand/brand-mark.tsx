import { cn } from "@/lib/utils";
import { brandConfig } from "@/config/brand";

type BrandMarkProps = {
  className?: string;
  /** Tamanho do quadrado (classe Tailwind size-*) */
  size?: "sm" | "md" | "lg" | "xl";
  title?: string;
};

const sizeMap = {
  sm: "size-7 text-[11px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
  xl: "size-12 text-base",
} as const;

/**
 * Marca reduzida — monograma "G" (sidebar recolhida, mobile, favicon UI).
 */
export function BrandMark({
  className,
  size = "md",
  title = brandConfig.name,
}: BrandMarkProps) {
  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--brand-graphite)] font-[family-name:var(--font-display)] font-bold tracking-tight text-[var(--brand-gold)] shadow-sm",
        sizeMap[size],
        className,
      )}
    >
      G
    </span>
  );
}
