import { Suspense } from "react";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import { VENDA_SUCCESS_MESSAGES } from "@/lib/vendas/constants";
import type { VendaSuccessMessage } from "@/types/vendas";

type VendaFeedbackProps = {
  success?: VendaSuccessMessage;
  error?: string;
};

function VendaFeedbackContent({ success, error }: VendaFeedbackProps) {
  if (error) {
    return <FeedbackMessage variant="error">{error}</FeedbackMessage>;
  }

  if (success && VENDA_SUCCESS_MESSAGES[success]) {
    return (
      <FeedbackMessage variant="success">
        {VENDA_SUCCESS_MESSAGES[success]}
      </FeedbackMessage>
    );
  }

  return null;
}

export function VendaFeedback(props: VendaFeedbackProps) {
  if (!props.success && !props.error) return null;

  return (
    <Suspense fallback={null}>
      <VendaFeedbackContent {...props} />
    </Suspense>
  );
}
