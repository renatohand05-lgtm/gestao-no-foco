import { Suspense } from "react";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import { PRODUTO_SUCCESS_MESSAGES } from "@/lib/produtos/constants";
import type { ProdutoSuccessMessage } from "@/types/produtos";

type ProdutoFeedbackProps = {
  success?: ProdutoSuccessMessage;
  error?: string;
};

function ProdutoFeedbackContent({ success, error }: ProdutoFeedbackProps) {
  if (error) {
    return <FeedbackMessage variant="error">{error}</FeedbackMessage>;
  }

  if (success && PRODUTO_SUCCESS_MESSAGES[success]) {
    return (
      <FeedbackMessage variant="success">
        {PRODUTO_SUCCESS_MESSAGES[success]}
      </FeedbackMessage>
    );
  }

  return null;
}

export function ProdutoFeedback(props: ProdutoFeedbackProps) {
  if (!props.success && !props.error) return null;

  return (
    <Suspense fallback={null}>
      <ProdutoFeedbackContent {...props} />
    </Suspense>
  );
}
