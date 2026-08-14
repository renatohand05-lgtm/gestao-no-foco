import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ComingSoonPanelProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  className?: string;
  /** Marcador estável para testes. */
  testId?: string;
};

/**
 * Painel honesto para módulos ainda não prontos para o cliente.
 * Não simula KPIs, feeds ou integrações ativas.
 */
export function ComingSoonPanel({
  title,
  description,
  icon: Icon = Clock,
  primaryAction,
  secondaryAction,
  className,
  testId = "coming-soon-panel",
}: ComingSoonPanelProps) {
  return (
    <Card
      className={cn("border-dashed", className)}
      data-coming-soon=""
      data-testid={testId}
    >
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-5 text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-medium tracking-[0.14em] text-[var(--brand-gold)] uppercase">
              Em breve
            </p>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      {(primaryAction || secondaryAction) && (
        <CardContent className="flex flex-wrap gap-2">
          {primaryAction ? (
            <Button render={<Link href={primaryAction.href} />}>
              {primaryAction.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button variant="outline" render={<Link href={secondaryAction.href} />}>
              {secondaryAction.label}
            </Button>
          ) : null}
        </CardContent>
      )}
    </Card>
  );
}
