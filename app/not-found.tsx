import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dsElevation, dsPadding, dsSpace, dsType } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export default function RootNotFound() {
  return (
    <main
      className={cn(
        "mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center",
        dsSpace.page,
      )}
    >
      <div className={cn(dsElevation.empty, dsPadding.empty, "w-full")}>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Erro 404
        </p>
        <FileQuestion className="mx-auto mt-3 size-10 text-muted-foreground" aria-hidden />
        <h1 className={cn("mt-4", dsType.pageTitle)}>Página não encontrada</h1>
        <p className={cn("mt-2", dsType.description)}>
          O endereço solicitado não existe ou foi movido.
        </p>
        <Button className="mt-6" render={<Link href="/" />}>
          Voltar ao início
        </Button>
      </div>
    </main>
  );
}
