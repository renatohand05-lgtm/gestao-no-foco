import { AnalyticsExecutivoPageInner } from "../_shared";

export const metadata = { title: "Analytics Tributário" };

export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return (
    <AnalyticsExecutivoPageInner
      tenantSlug={tenant}
      title="Analytics — Tributário"
      description="Carga e alertas a partir do Tax Intelligence parametrizado."
    />
  );
}
