import { redirect } from "next/navigation";

export const metadata = { title: "CRM Enterprise" };

export default async function CrmHubPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  redirect(`/${tenant}/crm/executivo`);
}
