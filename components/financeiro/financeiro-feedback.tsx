import { Suspense } from "react";

import { FeedbackSuspenseFallback } from "@/components/ui/feedback-suspense-fallback";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import { FINANCEIRO_SUCCESS_MESSAGES } from "@/lib/financeiro/constants";
import type { FinanceiroSuccessMessage } from "@/types/financeiro";

type FinanceiroFeedbackProps = {
  success?: FinanceiroSuccessMessage;
  error?: string;
};

function FinanceiroFeedbackContent({
  success,
  error,
}: FinanceiroFeedbackProps) {
  if (error) {
    return <FeedbackMessage variant="error">{error}</FeedbackMessage>;
  }

  if (success && FINANCEIRO_SUCCESS_MESSAGES[success]) {
    return (
      <FeedbackMessage variant="success">
        {FINANCEIRO_SUCCESS_MESSAGES[success]}
      </FeedbackMessage>
    );
  }

  return null;
}

export function FinanceiroFeedback(props: FinanceiroFeedbackProps) {
  if (!props.success && !props.error) return null;

  return (
    <Suspense fallback={<FeedbackSuspenseFallback />}>
      <FinanceiroFeedbackContent {...props} />
    </Suspense>
  );
}
