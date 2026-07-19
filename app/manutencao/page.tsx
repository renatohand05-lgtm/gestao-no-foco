import type { Metadata } from "next";

import { MaintenanceScreen } from "@/components/platform/maintenance-screen";

export const metadata: Metadata = {
  title: "Manutenção",
  robots: { index: false, follow: false },
};

export default function ManutencaoPage() {
  return <MaintenanceScreen showHomeLink />;
}
