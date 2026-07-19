"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";

import { ContaLifecycleEstornoDialog } from "@/components/financeiro/conta-lifecycle-dialogs";
import { Button } from "@/components/ui/button";
import type { ContaLifecycleSnapshot } from "@/lib/financeiro/conta-lifecycle";

type Props = {
  tenantSlug: string;
  kind: "pagar" | "receber";
  snapshot: ContaLifecycleSnapshot;
};

export function ContaLifecycleEstornoButton({
  tenantSlug,
  kind,
  snapshot,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <RotateCcw className="mr-2 size-4" />
        {kind === "pagar" ? "Estornar pagamento" : "Estornar recebimento"}
      </Button>
      <ContaLifecycleEstornoDialog
        open={open}
        onOpenChange={setOpen}
        tenantSlug={tenantSlug}
        kind={kind}
        snapshot={snapshot}
      />
    </>
  );
}
