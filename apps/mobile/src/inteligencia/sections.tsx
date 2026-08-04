import type { MobileIntelligencePack } from "@/api/mobile-api";
import { Badge, Card, Skeleton, Text } from "@/design/components";
import { useTheme } from "@/design/theme";
import { Pressable, StyleSheet, View } from "react-native";

type BadgeTone = "default" | "success" | "warning" | "danger";

function toneForLevel(level: string): BadgeTone {
  if (level === "excelente") return "success";
  if (level === "critico") return "danger";
  if (level === "atencao") return "warning";
  return "default";
}

const OPS_ROWS: {
  key: Exclude<keyof MobileIntelligencePack["operational"], "unavailable">;
  label: string;
}[] = [
  { key: "producaoDia", label: "Produção do dia" },
  { key: "ordensAbertas", label: "Ordens abertas" },
  { key: "ordensAtrasadas", label: "Ordens atrasadas" },
  { key: "agendaDia", label: "Agenda do dia" },
  { key: "mecanicosAtivos", label: "Mecânicos ativos" },
  { key: "tempoMedioOs", label: "Tempo médio por OS" },
  { key: "ticketMedio", label: "Ticket médio" },
  { key: "carrosEntregues", label: "Carros entregues" },
  { key: "servicosPendentes", label: "Serviços pendentes" },
  { key: "eficienciaOperacional", label: "Eficiência operacional" },
];

export function OperationalSection({
  operational,
}: {
  operational: MobileIntelligencePack["operational"];
}) {
  return (
    <Card style={styles.section}>
      <Text variant="subtitle">Dashboard Operacional</Text>
      <View style={styles.kpiGrid}>
        {OPS_ROWS.map((row) => {
          const value = operational[row.key];
          return (
            <View key={row.key} style={styles.kpiCard}>
              <Text variant="caption" muted>
                {row.label}
              </Text>
              <Text variant="title">{value ? value : "—"}</Text>
            </View>
          );
        })}
      </View>
      {operational.unavailable.length > 0 ? (
        <Text variant="caption" muted>
          Indisponível: {operational.unavailable.join(", ")}
        </Text>
      ) : null}
    </Card>
  );
}

export function KpiHealthSection({
  items,
}: {
  items: MobileIntelligencePack["kpiHealth"];
}) {
  return (
    <Card style={styles.section}>
      <Text variant="subtitle">KPI Health</Text>
      {items.length === 0 ? (
        <Text variant="caption" muted>
          Sem indicadores disponíveis no ciclo Analytics.
        </Text>
      ) : (
        items.slice(0, 12).map((item) => (
          <View key={item.metricId} style={styles.listItem}>
            <View style={styles.metaRow}>
              <Badge label={item.levelLabel} tone={toneForLevel(item.level)} />
              <Text variant="caption" muted>
                {item.trend}
                {item.deltaPercent != null ? ` · ${item.deltaPercent}%` : ""}
              </Text>
            </View>
            <Text variant="body">{item.name}</Text>
            <Text variant="title">{item.formatted}</Text>
            <Text variant="caption" muted numberOfLines={2}>
              {item.reason}
            </Text>
          </View>
        ))
      )}
    </Card>
  );
}

export function AlertCenterSection({
  center,
}: {
  center: MobileIntelligencePack["alertCenter"];
}) {
  const groups: {
    key: keyof Omit<MobileIntelligencePack["alertCenter"], "total">;
    label: string;
  }[] = [
    { key: "operacional", label: "Operacionais" },
    { key: "financeiro", label: "Financeiros" },
    { key: "crm", label: "CRM" },
    { key: "estoque", label: "Estoque" },
    { key: "agenda", label: "Agenda" },
    { key: "automacoes", label: "Automações" },
    { key: "sistema", label: "Sistema" },
  ];

  return (
    <Card style={styles.section}>
      <Text variant="subtitle">Central de Alertas</Text>
      <Text variant="caption" muted>
        {center.total} alerta(s) no ciclo
      </Text>
      {groups.map((g) => {
        const items = center[g.key];
        return (
          <View key={g.key} style={styles.group}>
            <Text variant="body">
              {g.label} ({items.length})
            </Text>
            {items.length === 0 ? (
              <Text variant="caption" muted>
                Nenhum neste ciclo.
              </Text>
            ) : (
              items.slice(0, 5).map((a) => (
                <View key={a.id} style={styles.listItem}>
                  <Badge label={a.priority} />
                  <Text variant="body">{a.title}</Text>
                  <Text variant="caption" muted numberOfLines={2}>
                    {a.description}
                  </Text>
                </View>
              ))
            )}
          </View>
        );
      })}
    </Card>
  );
}

export function AnalyticsDecisionSection({
  pack,
}: {
  pack: MobileIntelligencePack["analyticsDecision"];
}) {
  return (
    <Card style={styles.section}>
      <Text variant="subtitle">Decision Center (Analytics)</Text>
      {!pack.available ? (
        <Text variant="caption" muted>
          Analytics indisponível neste ciclo (permissão ou snapshot).
        </Text>
      ) : (
        <>
          {pack.headline ? (
            <Text variant="body">{pack.headline}</Text>
          ) : null}
          {pack.bottlenecks.length > 0 ? (
            <View style={styles.group}>
              <Text variant="caption" muted>
                Gargalos
              </Text>
              {pack.bottlenecks.map((b) => (
                <Text key={b} variant="body">
                  · {b}
                </Text>
              ))}
            </View>
          ) : null}
          {pack.risks.length > 0 ? (
            <View style={styles.group}>
              <Text variant="caption" muted>
                Riscos
              </Text>
              {pack.risks.map((b) => (
                <Text key={b} variant="body">
                  · {b}
                </Text>
              ))}
            </View>
          ) : null}
          {pack.opportunities.length > 0 ? (
            <View style={styles.group}>
              <Text variant="caption" muted>
                Oportunidades
              </Text>
              {pack.opportunities.map((b) => (
                <Text key={b} variant="body">
                  · {b}
                </Text>
              ))}
            </View>
          ) : null}
          {pack.decisions.slice(0, 8).map((d) => (
            <View key={d.id} style={styles.listItem}>
              <Badge label={d.priority} />
              <Text variant="body">{d.title}</Text>
              <Text variant="caption" muted numberOfLines={3}>
                {d.recommendation}
              </Text>
            </View>
          ))}
        </>
      )}
    </Card>
  );
}

export function IntelligenceMetasSection({
  metas,
}: {
  metas: MobileIntelligencePack["metas"];
}) {
  return (
    <Card style={styles.section}>
      <Text variant="subtitle">Metas</Text>
      <Text variant="caption" muted>
        Diária · {metas.dayTrend ?? "—"}
      </Text>
      <Text variant="body">
        {metas.day.realizado} / {metas.day.meta} ({metas.day.pct})
      </Text>
      <Text variant="caption" muted>
        Semanal · {metas.weekTrend ?? "—"}
      </Text>
      <Text variant="body">{metas.week.realizado}</Text>
      <Text variant="caption" muted>
        Mensal · {metas.monthTrend ?? "—"}
      </Text>
      <Text variant="title">{metas.month.realizado}</Text>
      <Text variant="body" muted>
        Meta {metas.month.meta} · {metas.month.pct}
      </Text>
    </Card>
  );
}

export function SmartActionsSection({
  actions,
  onPress,
}: {
  actions: MobileIntelligencePack["quickActions"];
  onPress: (action: MobileIntelligencePack["quickActions"][number]) => void;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.section}>
      <Text variant="subtitle">Quick Actions</Text>
      <View style={styles.actions}>
        {actions
          .filter((a) => a.enabled)
          .map((action) => (
            <Pressable
              key={action.id}
              onPress={() => onPress(action)}
              style={[styles.actionBtn, { borderColor: colors.border }]}
            >
              <Text variant="caption">{action.label}</Text>
            </Pressable>
          ))}
      </View>
    </Card>
  );
}

export function ModuleSyncSection({
  sync,
  modules,
}: {
  sync: MobileIntelligencePack["moduleSync"];
  modules: { module: string; minutesAgo: number | null }[];
}) {
  return (
    <Card style={styles.section}>
      <Text variant="subtitle">Snapshot Offline</Text>
      <Text variant="caption" muted>
        Última sincronização: {sync.lastSyncLabel}
      </Text>
      {modules.map((m) => (
        <Text key={m.module} variant="caption" muted>
          {m.module}:{" "}
          {m.minutesAgo == null ? "sem cache" : `há ${m.minutesAgo} min`}
        </Text>
      ))}
    </Card>
  );
}

export function IntelligenceSkeleton() {
  return (
    <View style={{ gap: 12, padding: 16 }}>
      <Skeleton style={{ height: 72, borderRadius: 12 }} />
      <Skeleton style={{ height: 160, borderRadius: 12 }} />
      <Skeleton style={{ height: 120, borderRadius: 12 }} />
      <Skeleton style={{ height: 120, borderRadius: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10, marginTop: 12 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiCard: { width: "47%", flexGrow: 1, gap: 4 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  listItem: { gap: 4, marginTop: 10, paddingTop: 8 },
  group: { gap: 4, marginTop: 10 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: "45%",
    flexGrow: 1,
  },
});
