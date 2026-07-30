import { AnalyticsExecutivoPageInner } from "../_shared";

export const metadata = { title: "Analytics Relatórios" };

export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return (
    <AnalyticsExecutivoPageInner
      tenantSlug={tenant}
      title="Analytics — Relatórios"
      description="CSV disponível; Excel/PDF em preparação (feature flags)."
    />
  );
}
