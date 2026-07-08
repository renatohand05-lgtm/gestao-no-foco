import { Briefcase, ShoppingBag, UtensilsCrossed, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const segments = [
  {
    icon: Wrench,
    title: "Oficinas mecânicas",
    description: "Ordens de serviço, peças, clientes e histórico de veículos.",
    badge: "Oficina",
  },
  {
    icon: UtensilsCrossed,
    title: "Restaurantes",
    description: "Controle de vendas, insumos, fornecedores e movimento diário.",
    badge: "Food",
  },
  {
    icon: ShoppingBag,
    title: "Comércios",
    description: "Estoque, PDV, clientes fiéis e gestão de margem.",
    badge: "Varejo",
  },
  {
    icon: Briefcase,
    title: "Consultorias & serviços",
    description: "Projetos, contratos, faturamento e acompanhamento de clientes.",
    badge: "Serviços",
  },
];

export function SegmentsSection() {
  return (
    <section id="segmentos" className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Feito para o seu segmento
          </h2>
          <p className="mt-4 text-muted-foreground">
            Uma base sólida que se adapta a diferentes tipos de negócio.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {segments.map((segment) => (
            <Card key={segment.title} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <segment.icon className="size-5" />
                  </div>
                  <Badge variant="outline">{segment.badge}</Badge>
                </div>
                <CardTitle className="text-xl">{segment.title}</CardTitle>
                <CardDescription>{segment.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
