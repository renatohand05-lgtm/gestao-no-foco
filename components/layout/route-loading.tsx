import { PremiumGlobalLoader } from "@/components/brand/premium-global-loader";

type Props = {
  /** Mantido por compat — não controla layout de skeleton. */
  cards?: number;
  label?: string;
  className?: string;
};

/**
 * Loading de rota — PremiumGlobalLoader (Sprint 25.6.2).
 */
export function RouteLoading({
  label = "Carregando conteúdo",
  className = "min-h-[60vh]",
}: Props) {
  return (
    <PremiumGlobalLoader className={className} label={label} variant="embed" />
  );
}

/** Alias — workspace / blocos de rota usam o mesmo loader global. */
export function WorkspaceLoading(props: Props) {
  return <RouteLoading {...props} />;
}
