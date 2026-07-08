import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function CtaSection() {
  return (
    <section id="precos" className="border-t bg-primary py-24 text-primary-foreground">
      <div className="container mx-auto px-4">
        <Card className="mx-auto max-w-2xl border-none bg-primary-foreground/10 text-primary-foreground">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Pronto para começar?</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Crie sua conta, cadastre sua empresa e comece a organizar seu
              negócio em minutos.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-primary-foreground/80">
            Plano inicial gratuito para experimentar. Sem cartão de crédito.
          </CardContent>
          <CardFooter className="justify-center gap-3">
            <Link
              href="/register"
              className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
            >
              Criar conta grátis
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10",
              )}
            >
              Já tenho conta
            </Link>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
