"use client";

import { useRouter } from "next/navigation";

import { QuickClientCreate } from "@/components/clientes/quick-client-create";

export function QuickClientPageEntry({
  tenantSlug,
  showVehicles,
  allowBusiness,
}: {
  tenantSlug: string;
  showVehicles: boolean;
  allowBusiness: boolean;
}) {
  const router = useRouter();
  return (
    <QuickClientCreate
      tenantSlug={tenantSlug}
      embedded
      showVehicles={showVehicles}
      allowBusiness={allowBusiness}
      onCreated={({ id }) => {
        router.push(`/${tenantSlug}/clientes/${id}`);
        router.refresh();
      }}
    />
  );
}
