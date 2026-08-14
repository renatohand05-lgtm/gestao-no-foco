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
      description="Mesmo núcleo do Analytics Executivo (filtros de período). Detalhe comercial operacional permanece em Vendas."
    />
  );
}
