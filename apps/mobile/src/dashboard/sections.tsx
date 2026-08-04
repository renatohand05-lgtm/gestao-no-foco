import type { MobileExecutiveDashboard } from "@/api/mobile-api";
import {
  Avatar,
  Badge,
  Card,
  Skeleton,
  Text,
} from "@/design/components";
import { useTheme } from "@/design/theme";
import { StyleSheet, View } from "react-native";

const PRIORITY_ORDER = ["critica", "alta", "media", "baixa"] as const;

type BadgeTone = "default" | "success" | "warning" | "danger";

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
  const { colors } = useTheme();
  return (
    <View style={styles.kpiGrid}>
      {kpis.map((kpi) => (
        <Card key={kpi.id} style={styles.kpiCard}>
          <Text variant="caption" muted>
            {kpi.title}
          </Text>
          <Text
            variant="title"
            style={{ color: kpi.unavailable ? colors.textMuted : colors.text }}
          >
            {kpi.value}
          </Text>
          {kpi.trendLabel ? (
            <Text variant="caption" muted>
              {kpi.trendLabel}
            </Text>
          ) : (
            <Text variant="caption" muted numberOfLines={2}>
              {kpi.supportingText}
            </Text>
          )}
        </Card>
      ))}
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
        <Badge label={`${decision.summary.criticalCount} críticos`} tone={"danger" as BadgeTone} />
        <Badge label={`${decision.summary.warningCount} alertas`} tone={"warning" as BadgeTone} />
        <Badge
          label={`${decision.summary.opportunityCount} oportunidades`}
          tone={"success" as BadgeTone}
        />
      </View>
      {decision.items.slice(0, 8).map((item) => (
        <View key={item.id} style={styles.listItem}>
          <Badge label={item.severity} />
          <Text variant="body">{item.title}</Text>
          <Text variant="caption" muted numberOfLines={3}>
            {item.description}
          </Text>
        </View>
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
          <View key={alert.id} style={styles.listItem}>
            <View style={styles.metaRow}>
              <Badge label={alert.priority} />
              <Badge label={alert.category} />
            </View>
            <Text variant="body">{alert.title}</Text>
            <Text variant="caption" muted numberOfLines={3}>
              {alert.description}
            </Text>
            <Text variant="caption" muted>
              {alert.suggestedAction} · {alert.source}
            </Text>
          </View>
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
  kpiCard: { width: "47%", flexGrow: 1, gap: 4 },
  section: { gap: 10, marginTop: 12 },
  briefRow: { gap: 2, marginTop: 8 },
  briefAction: { gap: 2, marginTop: 12 },
  listItem: { gap: 4, marginTop: 10, paddingTop: 8 },
});
