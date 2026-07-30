import { redirect } from "next/navigation";

export default async function IntegracoesImportarFinanceiroPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  redirect(`/${tenantSlug}/financeiro/importar`);
}
