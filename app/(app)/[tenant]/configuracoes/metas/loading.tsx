import { PremiumGlobalLoader } from "@/components/brand/premium-global-loader";

export default function MetasLoading() {
  return (
    <PremiumGlobalLoader
      className="min-h-[60vh]"
      label="Carregando conteúdo"
    />
  );
}
