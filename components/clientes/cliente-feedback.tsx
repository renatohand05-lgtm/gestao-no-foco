import { Suspense } from "react";

import { FeedbackSuspenseFallback } from "@/components/ui/feedback-suspense-fallback";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import { CLIENTE_SUCCESS_MESSAGES } from "@/lib/clientes/constants";
import type { ClienteSuccessMessage } from "@/types/clientes";

type ClienteFeedbackProps = {
  success?: ClienteSuccessMessage;
  error?: string;
};

function ClienteFeedbackContent({ success, error }: ClienteFeedbackProps) {
  if (error) {
    return <FeedbackMessage variant="error">{error}</FeedbackMessage>;
  }

  if (success && CLIENTE_SUCCESS_MESSAGES[success]) {
    return (
      <FeedbackMessage variant="success">
        {CLIENTE_SUCCESS_MESSAGES[success]}
      </FeedbackMessage>
    );
  }

  return null;
}

export function ClienteFeedback(props: ClienteFeedbackProps) {
  if (!props.success && !props.error) return null;

  return (
    <Suspense fallback={<FeedbackSuspenseFallback />}>
      <ClienteFeedbackContent {...props} />
    </Suspense>
  );
}
