"use client";

import { Ban } from "lucide-react";
import { useState } from "react";

import { ContaLifecycleCancelDialog } from "@/components/financeiro/conta-lifecycle-dialogs";
import { Button } from "@/components/ui/button";
import type { ContaLifecycleSnapshot } from "@/lib/financeiro/conta-lifecycle";

type Props = {
  tenantSlug: string;
  kind: "pagar" | "receber";
  snapshot: ContaLifecycleSnapshot;
};

export function ContaLifecycleCancelButton({
  tenantSlug,
  kind,
  snapshot,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Ban className="mr-2 size-4" />
        Cancelar
      </Button>
      <ContaLifecycleCancelDialog
        open={open}
        onOpenChange={setOpen}
        tenantSlug={tenantSlug}
        kind={kind}
        snapshot={snapshot}
      />
    </>
  );
}
