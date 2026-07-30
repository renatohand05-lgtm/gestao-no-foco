import { PremiumGlobalLoader } from "@/components/brand/premium-global-loader";

type BrandSplashProps = {
  className?: string;
  label?: string;
  /** @deprecated Visual removido — mantido por compat de API */
  progress?: boolean;
  /** @deprecated Visual removido — mantido por compat de API */
  officialLogo?: boolean;
};

/**
 * Splash / loading de rota — delega ao PremiumGlobalLoader (Sprint 25.6.2).
 * Apenas símbolo G oficial; label só para acessibilidade.
 */
export function BrandSplash({
  className,
  label = "Carregando conteúdo",
}: BrandSplashProps) {
  return (
    <PremiumGlobalLoader className={className} label={label} variant="embed" />
  );
}
