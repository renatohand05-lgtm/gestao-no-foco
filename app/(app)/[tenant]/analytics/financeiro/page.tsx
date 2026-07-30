import { AnalyticsExecutivoPageInner } from "../_shared";

export const metadata = { title: "Analytics Financeiro" };

export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return (
    <AnalyticsExecutivoPageInner
      tenantSlug={tenant}
      title="Analytics — Financeiro"
      description="KPIs financeiros a partir de DRE, FI e Cash Intelligence."
    />
  );
}
