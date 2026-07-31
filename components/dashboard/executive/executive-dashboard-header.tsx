"use client";

import { GFExecutiveHeader } from "@/components/gf/gf-executive-header";
import type { MetaDiaStatus } from "@/lib/dashboard/faturamento-agregacao";

type Props = {
  greeting: string;
  tenantName: string;
  dataHoje: string;
  updatedAtLabel: string;
  status: MetaDiaStatus;
  companyStatusLabel?: string;
  companyStatusTone?: "success" | "warning" | "danger" | "neutral" | "info";
  tenantSlug?: string;
};

/**
 * Header do cockpit — Sprint 26.2 delega ao GFExecutiveHeader.
 */
export function ExecutiveDashboardHeader(props: Props) {
  return <GFExecutiveHeader {...props} />;
}
