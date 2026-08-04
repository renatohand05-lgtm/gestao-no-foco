import type { MobileStockDashboard } from "@/api/mobile-api";
import { Card, Text } from "@/design/components";
import { useTheme } from "@/design/theme";
import { Pressable, StyleSheet, View } from "react-native";

export const STOCK_VIEW_PERMS = [
  "estoque.visualizar",
  "produtos.visualizar",
  "compras.visualizar",
  "fornecedores.visualizar",
  "supply.dashboard.visualizar",
  "dashboard.estoque",
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

export function StockHeader(props: {
  branchName: string | null;
  updatedAtLabel: string;
  offlineMinutes: number | null;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.header} accessibilityRole="header">
      <Text variant="title">Estoque</Text>
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

export function StockSummaryCards({ data }: { data: MobileStockDashboard }) {
  const k = data.kpis;
  return (
    <View style={styles.grid}>
      <KpiTile
        title="Produtos"
        value={k.produtosCadastrados != null ? String(k.produtosCadastrados) : "—"}
      />
      <KpiTile title="Valor estoque" value={k.valorEstoque ?? "—"} />
      <KpiTile
        title="Críticos"
        value={k.produtosCriticos != null ? String(k.produtosCriticos) : "—"}
      />
      <KpiTile
        title="Sem estoque"
        value={k.semEstoque != null ? String(k.semEstoque) : "—"}
      />
      <KpiTile
        title="Reposição"
        value={k.reposicaoUrgente != null ? String(k.reposicaoUrgente) : "—"}
      />
      <KpiTile
        title="Compras abertas"
        value={k.comprasAbertas != null ? String(k.comprasAbertas) : "—"}
      />
    </View>
  );
}

export function StockAlerts({
  alerts,
}: {
  alerts: MobileStockDashboard["alerts"];
}) {
  const { colors } = useTheme();
  if (!alerts.length) {
    return (
      <Card>
        <Text variant="subtitle">Alertas</Text>
        <Text variant="body" style={{ color: colors.textMuted, marginTop: 6 }}>
          Nenhum alerta de estoque no momento.
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

export function StockRecentMovements({
  items,
}: {
  items: MobileStockDashboard["recentMovements"];
}) {
  const { colors } = useTheme();
  if (!items.length) {
    return (
      <Card>
        <Text variant="subtitle">Últimas movimentações</Text>
        <Text variant="body" style={{ color: colors.textMuted, marginTop: 6 }}>
          Sem movimentações recentes.
        </Text>
      </Card>
    );
  }
  return (
    <Card>
      <Text variant="subtitle">Últimas movimentações</Text>
      {items.map((m) => (
        <View key={m.id} style={{ marginTop: 10 }}>
          <Text variant="body">
            {m.tipo} · {m.produtoNome}
          </Text>
          <Text variant="caption" style={{ color: colors.textMuted }}>
            qtd {m.quantidade} · {m.at.slice(0, 16).replace("T", " ")}
          </Text>
        </View>
      ))}
    </Card>
  );
}

export function StockQuickActions({
  actions,
  onPress,
}: {
  actions: MobileStockDashboard["quickActions"];
  onPress: (action: MobileStockDashboard["quickActions"][number]) => void;
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

export function StockSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12, padding: 16 }} accessibilityLabel="Carregando estoque">
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

export function stockErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const status = (err as Error & { status?: number }).status;
  if (status === 401) return "Sessão expirada. Faça login novamente.";
  if (status === 403) return "Sem permissão de estoque/compras neste tenant.";
  return err.message || fallback;
}

export function throwStockApiError(result: {
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
