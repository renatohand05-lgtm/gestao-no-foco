import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/dashboard/format";
import type { WeeklyDataPoint } from "@/types/dashboard";

type WeeklyOverviewProps = {
  data: WeeklyDataPoint[];
};

export function WeeklyOverview({ data }: WeeklyOverviewProps) {
  const maxValue = Math.max(...data.map((point) => point.value));
  const total = data.reduce((sum, point) => sum + point.value, 0);

  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">
            Desempenho semanal
          </CardTitle>
          <CardDescription>
            Volume de vendas nos últimos 7 dias
          </CardDescription>
        </div>
        <p className="text-sm text-muted-foreground">
          Total estimado:{" "}
          <span className="font-medium text-foreground">
            {formatCurrency(total * 420)}
          </span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex h-44 items-end justify-between gap-2 sm:gap-3">
          {data.map((point) => {
            const height = Math.max((point.value / maxValue) * 100, 8);

            return (
              <div
                key={point.label}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <div className="flex h-32 w-full items-end justify-center">
                  <div
                    className="w-full max-w-10 rounded-t-md bg-primary/80 transition-all hover:bg-primary"
                    style={{ height: `${height}%` }}
                    title={`${point.label}: ${point.value}%`}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
