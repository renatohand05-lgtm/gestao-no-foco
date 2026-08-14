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
      description="Mesmo núcleo do Analytics Executivo. Contas a receber/pagar e aging estão em Financeiro."
    />
  );
}
