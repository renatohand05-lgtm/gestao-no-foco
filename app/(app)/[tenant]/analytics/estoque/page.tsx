import { AnalyticsExecutivoPageInner } from "../_shared";

export const metadata = { title: "Analytics Estoque" };

export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return (
    <AnalyticsExecutivoPageInner
      tenantSlug={tenant}
      title="Analytics — Estoque"
      description="Mesmo núcleo do Analytics Executivo. Posição e baixo estoque: Estoque → Dashboard."
    />
  );
}
