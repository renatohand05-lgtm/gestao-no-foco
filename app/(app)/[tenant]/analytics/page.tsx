import { redirect } from "next/navigation";

export const metadata = { title: "Analytics Enterprise" };

export default async function AnalyticsIndexPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  redirect(`/${tenant}/analytics/executivo`);
}
