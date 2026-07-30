import { AnalyticsExecutivoPageInner } from "../_shared";

export const metadata = { title: "Analytics Metas" };

export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return (
    <AnalyticsExecutivoPageInner
      tenantSlug={tenant}
      title="Analytics — Metas"
      description="Atingimento via metas_vendas existentes."
    />
  );
}
