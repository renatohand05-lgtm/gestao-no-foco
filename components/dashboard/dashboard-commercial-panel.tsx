"use client";

import { ComercialPanel } from "@/components/dashboard/comercial/comercial-panel";
import { ComercialSkeleton } from "@/components/dashboard/comercial/comercial-skeleton";
import type { CommercialPanelData } from "@/types/commercial-panel";
import type { DashboardFilters } from "@/types/dashboard-executive";

type Props = {
  tenantSlug: string;
  tenantName: string;
  data: CommercialPanelData;
  filters: DashboardFilters;
};

export function DashboardCommercialPanel(props: Props) {
  return <ComercialPanel {...props} />;
}

export function DashboardCommercialPanelSkeleton() {
  return <ComercialSkeleton />;
}
