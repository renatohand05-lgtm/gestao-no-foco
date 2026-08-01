"use client";

import { GFExecutiveCopilot } from "@/components/intelligence/gf-executive-copilot";
import {
  askIntelligenceAction,
  submitIntelligenceFeedbackAction,
} from "@/lib/intelligence/enterprise/actions";

type Props = {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  permissions: string[];
};

export function InteligenciaCopilotClient(props: Props) {
  return (
    <GFExecutiveCopilot
      tenantSlug={props.tenantSlug}
      onAsk={async (question) =>
        askIntelligenceAction({
          tenantId: props.tenantId,
          tenantSlug: props.tenantSlug,
          userId: props.userId,
          permissions: props.permissions,
          question,
        })
      }
      onFeedback={async ({ responseId, rating, correlationId }) => {
        await submitIntelligenceFeedbackAction({
          tenantId: props.tenantId,
          userId: props.userId,
          responseId,
          rating,
          correlationId,
        });
      }}
    />
  );
}
