import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HeroSection() {
  return (
    <section className="container mx-auto px-4 py-24 md:py-32">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <Badge variant="secondary" className="mb-6">
          <Sparkles className="mr-1 size-3" />
          Multiempresa · Multiusuário · Inteligente
        </Badge>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Gestão empresarial no foco do que importa
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Centralize clientes, vendas, financeiro e operações em uma plataforma
          pensada para oficinas, restaurantes, comércios, consultorias e
          qualquer pequeno ou médio negócio.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            Criar conta gratuita
            <ArrowRight className="ml-2 size-4" />
          </Link>
          <Link
            href="#recursos"
            className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
          >
            Conhecer recursos
          </Link>
        </div>
      </div>
    </section>
  );
}
