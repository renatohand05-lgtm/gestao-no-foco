import type { MobileFinanceListItem, MobileFinanceSummary } from "@/api/mobile-api";
import { Card, Text } from "@/design/components";
import { useTheme } from "@/design/theme";
import { Pressable, StyleSheet, View } from "react-native";

/** @deprecated Importar de `@/finance/perms` no bootstrap (tab layout). */
export { FINANCE_VIEW_PERMS } from "@/finance/perms";

function moneyOrDash(v: string | null | undefined) {
  return v && v.trim().length > 0 ? v : "—";
}

function KpiTile({ title, value }: { title: string; value: string }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.kpi}>
      <Text variant="caption" style={{ color: colors.textMuted }}>
        {title}
      </Text>
      <Text variant="subtitle" style={{ marginTop: 6 }}>
        {value}
      </Text>
    </Card>
  );
}

export function FinanceHeader(props: {
  branchName: string | null;
  updatedAtLabel: string;
  period: { dataDe: string; dataAte: string };
  offlineMinutes: number | null;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.header} accessibilityRole="header">
      <Text variant="title">Financeiro</Text>
      <Text variant="caption" style={{ color: colors.textMuted }}>
        {props.branchName ? `Filial: ${props.branchName}` : "Todas as filiais"}
        {" · "}
        {props.period.dataDe} → {props.period.dataAte}
      </Text>
      <Text variant="caption" style={{ color: colors.textMuted }}>
        Atualizado {props.updatedAtLabel}
        {props.offlineMinutes != null
          ? ` · Offline há ${props.offlineMinutes} min (pode estar desatualizado)`
          : ""}
      </Text>
    </View>
  );
}

export function FinanceSummaryCards({ data }: { data: MobileFinanceSummary }) {
  return (
    <View style={styles.grid}>
      <KpiTile title="Saldo atual" value={moneyOrDash(data.saldoAtual)} />
      <KpiTile title="Entradas previstas" value={moneyOrDash(data.entradasPrevistas)} />
      <KpiTile title="Saídas previstas" value={moneyOrDash(data.saidasPrevistas)} />
      <KpiTile title="Saldo projetado" value={moneyOrDash(data.saldoProjetado)} />
      <KpiTile title="A receber" value={moneyOrDash(data.contasReceberAberto)} />
      <KpiTile title="A pagar" value={moneyOrDash(data.contasPagarAberto)} />
      <KpiTile title="Vencido receber" value={moneyOrDash(data.vencidoReceber)} />
      <KpiTile title="Vencido pagar" value={moneyOrDash(data.vencidoPagar)} />
      <KpiTile title="Resultado" value={moneyOrDash(data.resultado)} />
      <KpiTile title="Margem" value={moneyOrDash(data.margem)} />
    </View>
  );
}

export function FinanceAlerts({
  alerts,
}: {
  alerts: MobileFinanceSummary["alerts"];
}) {
  const { colors } = useTheme();
  if (!alerts.length) {
    return (
      <Card>
        <Text variant="subtitle">Alertas</Text>
        <Text variant="caption" style={{ color: colors.textMuted, marginTop: 6 }}>
          Nenhum alerta financeiro no momento.
        </Text>
      </Card>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <Text variant="subtitle">Alertas</Text>
      {alerts.map((a) => (
        <Card key={a.id} accessibilityRole="summary">
          <Text variant="subtitle">{a.title}</Text>
          <Text variant="caption" style={{ color: colors.textMuted, marginTop: 4 }}>
            Prioridade: {a.priority} · {a.description}
          </Text>
        </Card>
      ))}
    </View>
  );
}

export function FinanceQuickActions({
  actions,
  onPress,
}: {
  actions: MobileFinanceSummary["quickActions"];
  onPress: (action: MobileFinanceSummary["quickActions"][number]) => void;
}) {
  const enabled = actions.filter((a) => a.enabled);
  if (!enabled.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text variant="subtitle">Ações rápidas</Text>
      <View style={styles.actions}>
        {enabled.map((a) => (
          <Pressable
            key={a.id}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            onPress={() => onPress(a)}
            style={({ pressed }) => [styles.actionChip, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text variant="caption">
              {a.label}
              {a.opensWeb ? " (web)" : ""}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function FinanceListRow({
  item,
  onPress,
}: {
  item: MobileFinanceListItem;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.amount}, ${item.status}`}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <Card style={{ marginBottom: 8 }}>
        <View style={styles.rowTop}>
          <Text variant="subtitle" style={{ flex: 1 }}>
            {item.title}
          </Text>
          <Text variant="subtitle">{item.amount}</Text>
        </View>
        <Text variant="caption" style={{ color: colors.textMuted, marginTop: 4 }}>
          {item.subtitle}
        </Text>
        <Text variant="caption" style={{ color: colors.textMuted, marginTop: 2 }}>
          Venc. {item.dueDate}
          {" · "}
          Status: {item.status}
          {item.overdue ? " (atrasado)" : ""}
          {item.parcelLabel ? ` · Parcela ${item.parcelLabel}` : ""}
        </Text>
      </Card>
    </Pressable>
  );
}

export function FinanceSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12, padding: 16 }} accessibilityLabel="Carregando financeiro">
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            height: 72,
            borderRadius: 12,
            backgroundColor: colors.surface,
            opacity: 0.6,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4, marginBottom: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#3A3A3A",
    minHeight: 44,
    justifyContent: "center",
  },
  rowTop: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  kpi: { width: "47%", minWidth: 140, flexGrow: 1 },
});
