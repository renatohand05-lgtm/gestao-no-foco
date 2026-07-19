"use client";

import { useState } from "react";

import { ContaLifecycleDeleteDialog } from "@/components/financeiro/conta-lifecycle-dialogs";
import { ActionButton } from "@/components/ui/action-button";
import type { ContaLifecycleSnapshot } from "@/lib/financeiro/conta-lifecycle";

type Props = {
  tenantSlug: string;
  kind: "pagar" | "receber";
  snapshot: ContaLifecycleSnapshot;
};

export function ContaLifecycleDeleteButton({
  tenantSlug,
  kind,
  snapshot,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ActionButton action="delete" onClick={() => setOpen(true)} />
      <ContaLifecycleDeleteDialog
        open={open}
        onOpenChange={setOpen}
        tenantSlug={tenantSlug}
        kind={kind}
        snapshot={snapshot}
      />
    </>
  );
}
