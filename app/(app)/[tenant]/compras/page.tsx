import { redirect } from "next/navigation";

export default async function ComprasHubPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  redirect(`/${tenant}/compras/executivo`);
}
