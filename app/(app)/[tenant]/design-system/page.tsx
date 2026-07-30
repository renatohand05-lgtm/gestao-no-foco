import { redirect } from "next/navigation";

import { DesignSystemShowcase } from "@/components/design-system/showcase/design-system-showcase";
import { PremiumGlobalLoader } from "@/components/brand";
import { Suspense } from "react";
import {
  SHOWCASE_ACCESS_ROLES,
} from "@/lib/design-system/catalog/showcase-catalog";
import { requireTenant } from "@/lib/tenants";
import type { TenantRole } from "@/lib/constants";

export const metadata = {
  title: "Design System",
  description: "Biblioteca oficial de componentes — acesso interno",
};

export const dynamic = "force-dynamic";

function canAccessShowcase(role: TenantRole): boolean {
  return (SHOWCASE_ACCESS_ROLES as readonly string[]).includes(role);
}

/**
 * Showcase interno (Gate 19.5).
 * Protegido: owner | admin. Sem dados de negócio / sem Supabase extra.
 */
export default async function DesignSystemPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  if (!canAccessShowcase(tenant.role)) {
    redirect(`/${tenantSlug}/dashboard`);
  }

  return (
    <Suspense
      fallback={
        <PremiumGlobalLoader
          className="min-h-[60vh]"
          label="Carregando conteúdo"
        />
      }
    >
      <DesignSystemShowcase
        tenantSlug={tenant.slug}
        tenantName={tenant.name}
      />
    </Suspense>
  );
}
