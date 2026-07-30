import { AnalyticsExecutivoPageInner } from "../_shared";

export const metadata = { title: "Analytics Vendas" };

export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return (
    <AnalyticsExecutivoPageInner
      tenantSlug={tenant}
      title="Analytics — Vendas"
      description="Indicadores comerciais a partir do Commercial Intelligence."
    />
  );
}
