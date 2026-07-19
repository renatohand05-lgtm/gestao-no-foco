import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dsElevation, dsPadding, dsType } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export default function TenantNotFound() {
  return (
    <div className={cn(dsElevation.empty, dsPadding.empty, "mx-auto max-w-lg text-center")}>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Erro 404
      </p>
      <FileQuestion className="mx-auto mt-3 size-10 text-muted-foreground" aria-hidden />
      <h1 className={cn("mt-4", dsType.pageTitle)}>Recurso não encontrado</h1>
      <p className={cn("mt-2", dsType.description)}>
        Esta página não existe nesta empresa ou você não tem acesso.
      </p>
      <Button className="mt-6" render={<Link href="/" />}>
        Ir para o início
      </Button>
    </div>
  );
}
