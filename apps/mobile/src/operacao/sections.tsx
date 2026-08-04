import type { MobileOpsDashboard } from "@/api/mobile-api";
import { Card, Text } from "@/design/components";
import { useTheme } from "@/design/theme";
import { Pressable, StyleSheet, View } from "react-native";

export const OPS_VIEW_PERMS = [
  "os.visualizar",
  "centro_operacoes.visualizar",
  "dashboard.operacional",
  "agenda.visualizar",
  "mecanicos.visualizar",
  "clientes.visualizar",
] as const;

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

export function OpsHeader(props: {
  branchName: string | null;
  updatedAtLabel: string;
  offlineMinutes: number | null;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.header} accessibilityRole="header">
      <Text variant="title">Operação</Text>
      <Text variant="caption" style={{ color: colors.textMuted }}>
        {props.branchName ? `Filial: ${props.branchName}` : "Todas as filiais"}
      </Text>
      <Text variant="caption" style={{ color: colors.textMuted }}>
        Atualizado {props.updatedAtLabel}
        {props.offlineMinutes != null
          ? ` · Offline há ${props.offlineMinutes} min (somente leitura)`
          : ""}
      </Text>
    </View>
  );
}

export function OpsSummaryCards({ data }: { data: MobileOpsDashboard }) {
  const k = data.kpis;
  return (
    <View style={styles.grid}>
      <KpiTile
        title="Aguardando"
        value={k.aguardando != null ? String(k.aguardando) : "—"}
      />
      <KpiTile
        title="Em execução"
        value={k.emExecucao != null ? String(k.emExecucao) : "—"}
      />
      <KpiTile
        title="Prontos"
        value={k.prontos != null ? String(k.prontos) : "—"}
      />
      <KpiTile
        title="Entregues hoje"
        value={k.entreguesHoje != null ? String(k.entreguesHoje) : "—"}
      />
      <KpiTile title="Faturamento" value={k.faturamento ?? "—"} />
      <KpiTile title="Ticket médio" value={k.ticketMedio ?? "—"} />
      <KpiTile title="Ocupação" value={k.ocupacaoRecursos ?? "—"} />
      <KpiTile title="Produtividade" value={k.produtividadeMecanicos ?? "—"} />
    </View>
  );
}

export function OpsAlerts({
  alerts,
}: {
  alerts: MobileOpsDashboard["alerts"];
}) {
  const { colors } = useTheme();
  if (!alerts.length) {
    return (
      <Card>
        <Text variant="subtitle">Alertas</Text>
        <Text variant="body" style={{ color: colors.textMuted, marginTop: 6 }}>
          Nenhum alerta operacional no momento.
        </Text>
      </Card>
    );
  }
  return (
    <Card>
      <Text variant="subtitle">Alertas</Text>
      {alerts.map((a) => (
        <View key={a.id} style={{ marginTop: 10 }}>
          <Text variant="body">{a.title}</Text>
          <Text variant="caption" style={{ color: colors.textMuted }}>
            {a.description}
          </Text>
        </View>
      ))}
    </Card>
  );
}

export function OpsQuickActions({
  actions,
  onPress,
}: {
  actions: MobileOpsDashboard["quickActions"];
  onPress: (action: MobileOpsDashboard["quickActions"][number]) => void;
}) {
  const { colors } = useTheme();
  return (
    <Card>
      <Text variant="subtitle">Ações rápidas</Text>
      <View style={styles.actions}>
        {actions.map((a) => (
          <Pressable
            key={a.id}
            disabled={!a.enabled}
            onPress={() => onPress(a)}
            style={[
              styles.actionChip,
              {
                borderColor: colors.border,
                opacity: a.enabled ? 1 : 0.45,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            accessibilityState={{ disabled: !a.enabled }}
          >
            <Text variant="caption">{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

export function OpsSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12, padding: 16 }} accessibilityLabel="Carregando operação">
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

export function opsErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const status = (err as Error & { status?: number }).status;
  if (status === 401) return "Sessão expirada. Faça login novamente.";
  if (status === 403) return "Sem permissão de operação neste tenant.";
  return err.message || fallback;
}

export function throwOpsApiError(result: {
  ok: false;
  status: number;
  error: { message: string };
}): never {
  const err = new Error(result.error.message) as Error & { status?: number };
  err.status = result.status;
  throw err;
}

const styles = StyleSheet.create({
  header: { gap: 4, marginBottom: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kpi: { width: "47%", minWidth: 140, flexGrow: 1 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  actionChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    justifyContent: "center",
  },
});
