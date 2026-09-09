import type { MobileExecutiveDashboard } from "@/api/mobile-api";
import {
  Avatar,
  Badge,
  Card,
  KpiCard,
  Severity,
  SeverityCard,
  Skeleton,
  Text,
} from "@/design/components";
import { useTheme } from "@/design/theme";
import { Feather } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

const PRIORITY_ORDER = ["critica", "alta", "media", "baixa"] as const;

function severityFromKpiTone(tone: string): Severity {
  if (tone === "danger") return "critical";
  if (tone === "warning") return "warning";
  if (tone === "success") return "success";
  return "info";
}

function severityFromDecision(severity: string): Severity {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "warning";
  if (severity === "opportunity") return "success";
  return "info";
}

function severityFromAlertPriority(priority: string): Severity {
  if (priority === "critica") return "critical";
  if (priority === "alta" || priority === "media") return "warning";
  return "info";
}

export function DashboardHeader({
  data,
  offlineMinutes,
}: {
  data: MobileExecutiveDashboard;
  offlineMinutes?: number | null;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Avatar label={data.user.initials || data.user.displayName || "?"} />
        <View style={styles.headerText}>
          <Text variant="display">{data.greeting}</Text>
          <Text variant="body" muted>
            {data.welcome}
          </Text>
        </View>
        <Feather name="bell" size={18} color={colors.textMuted} />
      </View>
      <View style={styles.metaRow}>
        <Badge label={data.context.tenantName} />
        {data.context.branchName ? (
          <Badge label={data.context.branchName} />
        ) : (
          <Badge label="Sem filial" />
        )}
        <Badge label={data.clock.timeLabel} />
      </View>
      <Text variant="caption" muted>
        {data.clock.dateLabel}
        {offlineMinutes != null
          ? ` · Offline · atualizado há ${offlineMinutes} min`
          : ` · ${data.updatedAtLabel}`}
      </Text>
      {offlineMinutes != null ? (
        <Text variant="caption" style={{ color: colors.primary, marginTop: 4 }}>
          Modo offline limitado — dados podem estar desatualizados.
        </Text>
      ) : null}
    </View>
  );
}

export function KpiGrid({
  kpis,
}: {
  kpis: MobileExecutiveDashboard["kpis"];
}) {
  return (
    <View style={styles.kpiGrid}>
      {kpis.map((kpi) => {
        const severity = severityFromKpiTone(kpi.tone);
        const trend =
          severity === "success" ? "up" : severity === "critical" ? "down" : "neutral";
        const tone =
          kpi.tone === "danger" || kpi.tone === "warning" || kpi.tone === "success"
            ? kpi.tone
            : "neutral";
        return (
          <KpiCard
            key={kpi.id}
            label={kpi.title}
            value={kpi.value}
            unavailable={kpi.unavailable}
            trend={trend}
            tone={tone}
            trendLabel={kpi.trendLabel ?? undefined}
            supportingText={kpi.supportingText}
          />
        );
      })}
    </View>
  );
}

export function BriefSection({ brief }: { brief: MobileExecutiveDashboard["brief"] }) {
  return (
    <Card style={styles.section}>
      <Text variant="subtitle">Executive Brief</Text>
      {[brief.day, brief.week, brief.month].map((p) => (
        <View key={p.label} style={styles.briefRow}>
          <Text variant="caption" muted>
            {p.label}
          </Text>
          <Text variant="subtitle">{p.value}</Text>
          <Text variant="caption" muted>
            {p.detail}
          </Text>
        </View>
      ))}
      {brief.nextAction ? (
        <View style={styles.briefAction}>
          <Text variant="caption" muted>
            Próxima ação
          </Text>
          <Text variant="body">{brief.nextAction.label}</Text>
          <Text variant="caption" muted>
            {brief.nextAction.reason}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

export function DecisionSection({
  decision,
}: {
  decision: MobileExecutiveDashboard["decision"];
}) {
  return (
    <Card style={styles.section}>
      <Text variant="subtitle">Decision Center</Text>
      <Text variant="caption" muted>
        {decision.summary.headline}
      </Text>
      <View style={styles.metaRow}>
        <Badge label={`${decision.summary.criticalCount} críticos`} tone="danger" />
        <Badge label={`${decision.summary.warningCount} alertas`} tone="warning" />
        <Badge
          label={`${decision.summary.opportunityCount} oportunidades`}
          tone="success"
        />
      </View>
      {decision.items.slice(0, 8).map((item) => (
        <SeverityCard
          key={item.id}
          title={item.title}
          subtitle={item.description}
          tone={severityFromDecision(item.severity)}
        />
      ))}
    </Card>
  );
}

export function AlertsSection({
  alerts,
}: {
  alerts: MobileExecutiveDashboard["alerts"];
}) {
  const sorted = [...alerts].sort((a, b) => {
    const ia = PRIORITY_ORDER.indexOf(a.priority as (typeof PRIORITY_ORDER)[number]);
    const ib = PRIORITY_ORDER.indexOf(b.priority as (typeof PRIORITY_ORDER)[number]);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  return (
    <Card style={styles.section}>
      <Text variant="subtitle">Alertas</Text>
      {sorted.length === 0 ? (
        <Text variant="caption" muted>
          Nenhum alerta acionável neste ciclo.
        </Text>
      ) : (
        sorted.map((alert) => (
          <SeverityCard
            key={alert.id}
            title={alert.title}
            subtitle={`${alert.description}\n${alert.suggestedAction} · ${alert.source}`}
            tone={severityFromAlertPriority(alert.priority)}
          />
        ))
      )}
    </Card>
  );
}

export function MetasSection({ metas }: { metas: MobileExecutiveDashboard["metas"] }) {
  return (
    <Card style={styles.section}>
      <Text variant="subtitle">Metas</Text>
      <Text variant="caption" muted>
        Mensal
      </Text>
      <Text variant="title">{metas.month.realizado}</Text>
      <Text variant="body" muted>
        Meta {metas.month.meta} · {metas.month.pct}
      </Text>
      <Text variant="caption" muted>
        Projeção {metas.month.projecao} · resta {metas.month.diasRestantes}
      </Text>
      <View style={styles.briefRow}>
        <Text variant="caption" muted>
          {metas.day.label}
        </Text>
        <Text variant="body">
          {metas.day.realizado} / {metas.day.meta} ({metas.day.pct})
        </Text>
      </View>
      <View style={styles.briefRow}>
        <Text variant="caption" muted>
          {metas.week.label}
        </Text>
        <Text variant="body">{metas.week.realizado}</Text>
      </View>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <View style={{ gap: 12, padding: 16 }}>
      <Skeleton style={{ height: 72, borderRadius: 12 }} />
      <View style={styles.kpiGrid}>
        <Skeleton style={{ height: 88, flex: 1, borderRadius: 12 }} />
        <Skeleton style={{ height: 88, flex: 1, borderRadius: 12 }} />
      </View>
      <Skeleton style={{ height: 160, borderRadius: 12 }} />
      <Skeleton style={{ height: 120, borderRadius: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 10, marginBottom: 16 },
  headerRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  headerText: { flex: 1, gap: 4 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  section: { gap: 10, marginTop: 12 },
  briefRow: { gap: 2, marginTop: 8 },
  briefAction: { gap: 2, marginTop: 12 },
});
