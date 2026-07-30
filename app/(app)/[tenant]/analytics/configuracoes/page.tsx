import { AnalyticsExecutivoPageInner } from "../_shared";

export const metadata = { title: "Analytics Configurações" };

export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return (
    <AnalyticsExecutivoPageInner
      tenantSlug={tenant}
      title="Analytics — Configurações"
      description="Estrutura de layout pronta; reutiliza preferências/dashboard_layouts existentes — sem editor drag-and-drop."
    />
  );
}
