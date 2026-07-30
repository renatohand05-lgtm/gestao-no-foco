import { PremiumGlobalLoader } from "@/components/brand/premium-global-loader";

export default function VendasLoading() {
  return (
    <PremiumGlobalLoader
      className="min-h-[60vh]"
      label="Carregando conteúdo"
    />
  );
}
