import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type SchemaPendingBannerProps = {
  message: string;
  missing: string[];
};

/**
 * Sprint 30.2 — banner honesto: recursos avançados de Equipe dependem da
 * migration 20260820_phase30_2_team_rbac.sql, aplicada manualmente.
 */
export function SchemaPendingBanner({ message, missing }: SchemaPendingBannerProps) {
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="flex items-start gap-3 py-4">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Recursos avançados de Equipe indisponíveis
          </p>
          <p className="text-sm text-muted-foreground">{message}</p>
          {missing.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Pendente: {missing.join(", ")}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
