import { PremiumGlobalLoader } from "@/components/brand/premium-global-loader";

export default function AuthLoading() {
  return (
    <PremiumGlobalLoader
      className="min-h-screen"
      label="Carregando conteúdo"
      variant="embed"
    />
  );
}
