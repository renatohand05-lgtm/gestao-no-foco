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
      description="Exportação CSV do núcleo executivo quando habilitada; Excel/PDF em preparação (flags). Sem BI paralelo."
    />
  );
}
