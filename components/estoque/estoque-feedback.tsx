import { Suspense } from "react";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import { ESTOQUE_SUCCESS_MESSAGES } from "@/lib/estoque/constants";
import type { EstoqueSuccessMessage } from "@/types/estoque";

type EstoqueFeedbackProps = {
  success?: EstoqueSuccessMessage;
  error?: string;
};

function EstoqueFeedbackContent({ success, error }: EstoqueFeedbackProps) {
  if (error) {
    return <FeedbackMessage variant="error">{error}</FeedbackMessage>;
  }

  if (success && ESTOQUE_SUCCESS_MESSAGES[success]) {
    return (
      <FeedbackMessage variant="success">
        {ESTOQUE_SUCCESS_MESSAGES[success]}
      </FeedbackMessage>
    );
  }

  return null;
}

export function EstoqueFeedback(props: EstoqueFeedbackProps) {
  if (!props.success && !props.error) return null;

  return (
    <Suspense fallback={null}>
      <EstoqueFeedbackContent {...props} />
    </Suspense>
  );
}
