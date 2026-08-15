import type { Metadata } from "next";

import { ProfessionalsListScreen } from "@/components/mecanicos/professionals-list-screen";

export const metadata: Metadata = { title: "Profissionais" };

export default async function ProfissionaisPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  return (
    <ProfessionalsListScreen
      tenantSlug={tenantSlug}
      routePath="/profissionais"
    />
  );
}
