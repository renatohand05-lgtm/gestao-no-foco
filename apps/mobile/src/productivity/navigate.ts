import { webHref } from "@/dashboard/web-links";
import { pushRecent } from "@/productivity/storage";
import type { ProductivityEntityType } from "@/productivity/types";
import { router } from "expo-router";
import { Linking } from "react-native";

export async function openProductivityRoute(input: {
  route: string;
  opensWeb?: boolean;
  tenantSlug?: string | null;
  recent?: {
    userId: string;
    tenantId: string;
    branchId: string | null;
    id: string;
    type: ProductivityEntityType;
    title: string;
    subtitle?: string | null;
  };
}) {
  if (input.recent) {
    await pushRecent(
      input.recent.userId,
      input.recent.tenantId,
      input.recent.branchId,
      {
        id: input.recent.id,
        type: input.recent.type,
        title: input.recent.title,
        subtitle: input.recent.subtitle,
        route: input.route,
        opensWeb: Boolean(input.opensWeb),
      },
    );
  }

  if (input.opensWeb) {
    const href = input.route.startsWith("http")
      ? input.route
      : webHref(input.route);
    await Linking.openURL(href);
    return;
  }

  router.push(input.route as never);
}
