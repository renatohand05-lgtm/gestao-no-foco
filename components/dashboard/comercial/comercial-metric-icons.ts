import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CircleDollarSign,
  Gauge,
  LineChart,
  Percent,
  ShieldCheck,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Chaves serializáveis → ícones Lucide.
 * Resolução ocorre no boundary que renderiza (não passa Lucide via Server→Client props).
 */
export type ComercialMetricIconKey =
  | "meta"
  | "realizado"
  | "projecao"
  | "gap"
  | "ritmo"
  | "tendencia"
  | "ticket"
  | "confianca"
  | "probabilidade"
  | "dias"
  | "comparacao"
  | "alerta"
  | "atingimento";

export const COMERCIAL_METRIC_ICONS: Record<
  ComercialMetricIconKey,
  LucideIcon
> = {
  meta: Target,
  realizado: Wallet,
  projecao: LineChart,
  gap: CircleDollarSign,
  ritmo: Activity,
  tendencia: TrendingUp,
  ticket: CircleDollarSign,
  confianca: ShieldCheck,
  probabilidade: Gauge,
  dias: CalendarDays,
  comparacao: Percent,
  alerta: AlertTriangle,
  atingimento: Percent,
};
