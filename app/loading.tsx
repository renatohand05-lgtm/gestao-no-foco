import { PremiumGlobalLoader } from "@/components/brand/premium-global-loader";

export default function RootLoading() {
  return (
    <PremiumGlobalLoader
      className="min-h-screen"
      label="Carregando conteúdo"
      variant="embed"
    />
  );
}
