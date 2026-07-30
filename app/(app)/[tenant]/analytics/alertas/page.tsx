import { AnalyticsExecutivoPageInner } from "../_shared";

export const metadata = { title: "Analytics Alertas" };

export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return (
    <AnalyticsExecutivoPageInner
      tenantSlug={tenant}
      title="Analytics — Alertas"
      description="Alertas executivos deduplicados com revisão humana."
    />
  );
}
