import { AnalyticsExecutivoPageInner } from "../_shared";

export const metadata = { title: "Analytics Executivo" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { tenant } = await params;
  const sp = await searchParams;
  return (
    <AnalyticsExecutivoPageInner
      tenantSlug={tenant}
      periodPreset={sp.period}
    />
  );
}
