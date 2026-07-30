import { PremiumGlobalLoader } from "@/components/brand/premium-global-loader";

export default function DashboardLoading() {
  return (
    <PremiumGlobalLoader
      className="min-h-[70vh]"
      label="Carregando conteúdo"
      variant="embed"
    />
  );
}
