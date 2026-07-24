import { BrandSplash } from "@/components/brand";

type Props = {
  /** Mantido por compat — BrandSplash unificado (Gate 19.4.1). */
  cards?: number;
  label?: string;
  className?: string;
};

/**
 * Loading de rota — sempre BrandSplash (Gate 19.4.1).
 * Mesma animação, logo, tipografia e barra Brand.
 */
export function RouteLoading({
  label = "Carregando…",
  className = "min-h-[60vh]",
}: Props) {
  return <BrandSplash className={className} label={label} />;
}

/** Alias oficial — workspace / blocos usam o mesmo BrandSplash. */
export function WorkspaceLoading(props: Props) {
  return <RouteLoading {...props} />;
}
