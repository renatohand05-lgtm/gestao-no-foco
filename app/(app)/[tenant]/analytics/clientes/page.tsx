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
      description="Mesmo núcleo do Analytics Executivo. Cadastro e CRM operacional permanecem em Clientes."
    />
  );
}
