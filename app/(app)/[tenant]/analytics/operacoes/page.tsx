import { AnalyticsExecutivoPageInner } from "../_shared";

export const metadata = { title: "Analytics Operações" };

export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return (
    <AnalyticsExecutivoPageInner
      tenantSlug={tenant}
      title="Analytics — Operações"
      description="Mesmo núcleo do Analytics Executivo. OS por status: módulo Ordens."
    />
  );
}
