import Link from "next/link";
import { Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dsElevation, dsPadding, dsSpace, dsType } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  showHomeLink?: boolean;
  message?: string;
};

export function MaintenanceScreen({
  showHomeLink = false,
  message = "Estamos realizando uma manutenção programada. Tente novamente em alguns minutos.",
}: Props) {
  return (
    <main
      className={cn(
        "mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center text-center",
        dsSpace.page,
      )}
    >
      <div className={cn(dsElevation.empty, dsPadding.empty, "w-full")}>
        <Wrench className="mx-auto size-10 text-muted-foreground" aria-hidden />
        <p className="mt-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Manutenção
        </p>
        <h1 className={cn("mt-2", dsType.pageTitle)}>Sistema temporariamente indisponível</h1>
        <p className={cn("mt-2", dsType.description)}>{message}</p>
        {showHomeLink ? (
          <Button className="mt-6" render={<Link href="/" />}>
            Tentar novamente
          </Button>
        ) : null}
      </div>
    </main>
  );
}
