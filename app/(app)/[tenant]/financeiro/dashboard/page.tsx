import { redirect } from "next/navigation";

/** Alias canônico Sprint 15 → cockpit financeiro existente. */
export default async function FinanceiroDashboardRedirect({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  redirect(`/${tenant}/financeiro/inteligencia`);
}
