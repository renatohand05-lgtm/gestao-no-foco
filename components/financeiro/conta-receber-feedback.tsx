import { Suspense } from "react";

import { FeedbackSuspenseFallback } from "@/components/ui/feedback-suspense-fallback";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import { CONTAS_RECEBER_SUCCESS_MESSAGES } from "@/lib/financeiro/constants";
import type { ContaReceberSuccessMessage } from "@/types/contas-receber";

type ContaReceberFeedbackProps = {
  success?: ContaReceberSuccessMessage;
  error?: string;
};

function ContaReceberFeedbackContent({
  success,
  error,
}: ContaReceberFeedbackProps) {
  if (error) {
    return <FeedbackMessage variant="error">{error}</FeedbackMessage>;
  }

  if (success && CONTAS_RECEBER_SUCCESS_MESSAGES[success]) {
    return (
      <FeedbackMessage variant="success">
        {CONTAS_RECEBER_SUCCESS_MESSAGES[success]}
      </FeedbackMessage>
    );
  }

  return null;
}

export function ContaReceberFeedback(props: ContaReceberFeedbackProps) {
  if (!props.success && !props.error) return null;

  return (
    <Suspense fallback={<FeedbackSuspenseFallback />}>
      <ContaReceberFeedbackContent {...props} />
    </Suspense>
  );
}
