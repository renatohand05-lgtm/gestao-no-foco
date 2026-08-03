import { redirect } from "next/navigation";

import { requireIntegracoesAccess } from "@/lib/integracoes/page-auth";

/**
 * Alias estável → rota canônica /integracoes (Sprint 30.8).
 */
export default async function IntegracoesHubAliasPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireIntegracoesAccess(tenantSlug);
  redirect(`/${tenantSlug}/integracoes`);
}
