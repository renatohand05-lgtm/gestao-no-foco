import {
  BarChart3,
  Building2,
  Shield,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Building2,
    title: "Multiempresa",
    description:
      "Gerencie várias empresas em uma única conta, com troca rápida entre negócios.",
  },
  {
    icon: Users,
    title: "Equipes colaborativas",
    description:
      "Convide membros, defina papéis e controle quem acessa cada área do sistema.",
  },
  {
    icon: Wallet,
    title: "Financeiro integrado",
    description:
      "Acompanhe receitas, despesas e fluxo de caixa com visão clara do resultado.",
  },
  {
    icon: Wrench,
    title: "Ordens de serviço",
    description:
      "Ideal para oficinas e prestadores: controle status, peças e entregas.",
  },
  {
    icon: BarChart3,
    title: "Relatórios inteligentes",
    description:
      "Indicadores e dashboards para tomar decisões com base em dados reais.",
  },
  {
    icon: Shield,
    title: "Segurança e isolamento",
    description:
      "Dados separados por empresa com autenticação segura via Supabase.",
  },
];

export function FeaturesSection() {
  return (
    <section id="recursos" className="border-t bg-muted/20 py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Tudo que seu negócio precisa
          </h2>
          <p className="mt-4 text-muted-foreground">
            Módulos flexíveis que se adaptam ao seu segmento, do balcão ao
            escritório.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="size-5" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
