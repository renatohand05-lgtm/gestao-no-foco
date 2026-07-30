"use client";

import { ConfidenceBadge } from "@/components/import-engine/confidence-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SuggestionExplanation } from "@/lib/import-engine/assisted-intelligence";

export function SuggestionExplanationPanel({
  title,
  explanation,
}: {
  title: string;
  explanation: SuggestionExplanation;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{explanation.attribution}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{explanation.suggested ?? "—"}</span>
          <ConfidenceBadge
            band={explanation.band as "high" | "medium" | "low" | "unrecognized"}
            percent={explanation.confidence}
            origin={explanation.priorityRule}
          />
        </div>
        <p>
          <span className="text-muted-foreground">Por quê: </span>
          {explanation.why}
        </p>
        <p>
          <span className="text-muted-foreground">Prioridade: </span>
          {explanation.priorityRule}
        </p>
        {explanation.signals.length > 0 ? (
          <p>
            <span className="text-muted-foreground">Sinais: </span>
            {explanation.signals.join(", ")}
          </p>
        ) : null}
        {explanation.alternatives.length > 0 ? (
          <ul className="list-inside list-disc text-muted-foreground">
            {explanation.alternatives.map((a) => (
              <li key={`${a.value}-${a.reason}`}>
                {a.value} ({Math.round(a.confidence * 100)}%) — {a.reason}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
