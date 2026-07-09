import { Suspense } from "react";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import { CONTAS_PAGAR_SUCCESS_MESSAGES } from "@/lib/financeiro/constants";
import type { ContaPagarSuccessMessage } from "@/types/contas-pagar";

type ContaPagarFeedbackProps = {
  success?: ContaPagarSuccessMessage;
  error?: string;
};

function ContaPagarFeedbackContent({
  success,
  error,
}: ContaPagarFeedbackProps) {
  if (error) {
    return <FeedbackMessage variant="error">{error}</FeedbackMessage>;
  }

  if (success && CONTAS_PAGAR_SUCCESS_MESSAGES[success]) {
    return (
      <FeedbackMessage variant="success">
        {CONTAS_PAGAR_SUCCESS_MESSAGES[success]}
      </FeedbackMessage>
    );
  }

  return null;
}

export function ContaPagarFeedback(props: ContaPagarFeedbackProps) {
  if (!props.success && !props.error) return null;

  return (
    <Suspense fallback={null}>
      <ContaPagarFeedbackContent {...props} />
    </Suspense>
  );
}
