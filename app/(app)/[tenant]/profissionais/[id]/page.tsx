import { ProfessionalsDetailScreen } from "@/components/mecanicos/professionals-detail-screen";

export default async function ProfissionalDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  return (
    <ProfessionalsDetailScreen
      tenantSlug={tenantSlug}
      id={id}
      routePath="/profissionais"
    />
  );
}
