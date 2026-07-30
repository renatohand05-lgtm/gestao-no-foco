import { AnalyticsExecutivoPageInner } from "../_shared";

export const metadata = { title: "Analytics Clientes" };

export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return (
    <AnalyticsExecutivoPageInner
      tenantSlug={tenant}
      title="Analytics — Clientes"
      description="Carteira e riscos a partir do CRM Executivo."
    />
  );
}
