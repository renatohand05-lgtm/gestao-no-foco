import { PremiumGlobalLoader } from "@/components/brand/premium-global-loader";

export default function FinanceiroLoading() {
  return (
    <PremiumGlobalLoader
      className="min-h-[60vh]"
      label="Carregando conteúdo"
    />
  );
}
