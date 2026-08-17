import Link from "next/link";

import { PAYMENT_METHODS_EMPTY_TEXT } from "@/lib/financeiro/formas-pagamento-catalog";

type Props = {
  tenantSlug: string;
  canConfigure?: boolean;
};

export function FormasPagamentoEmptyHint({ tenantSlug, canConfigure }: Props) {
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      {PAYMENT_METHODS_EMPTY_TEXT}
      {canConfigure ? (
        <>
          {" — "}
          <Link
            href={`/${tenantSlug}/financeiro/formas-pagamento`}
            className="underline"
          >
            abrir configuração
          </Link>
        </>
      ) : null}
    </p>
  );
}
