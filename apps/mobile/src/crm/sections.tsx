import type { MobileCrmDashboard, MobileCrmPipeline } from "@/api/mobile-api";
import { Card, Text } from "@/design/components";
import { useTheme } from "@/design/theme";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

export const CRM_VIEW_PERMS = [
  "crm.visualizar",
  "crm.dashboard.visualizar",
  "crm.pipeline.visualizar",
  "clientes.visualizar",
] as const;

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

export function CrmHeader(props: {
  branchName: string | null;
  updatedAtLabel: string;
  offlineMinutes: number | null;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.header} accessibilityRole="header">
      <Text variant="title">CRM</Text>
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

export function CrmSummaryCards({ data }: { data: MobileCrmDashboard }) {
  return (
    <View style={styles.grid}>
      <KpiTile title="Receita prevista" value={moneyOrDash(data.kpis.receitaPrevista)} />
      <KpiTile title="Receita fechada" value={moneyOrDash(data.kpis.receitaFechada)} />
      <KpiTile title="Receita provável" value={moneyOrDash(data.kpis.receitaProvavel)} />
      <KpiTile title="Conversão" value={moneyOrDash(data.kpis.conversao)} />
      <KpiTile
        title="Follow-ups"
        value={
          data.kpis.followUpsPendentes != null
            ? String(data.kpis.followUpsPendentes)
            : "—"
        }
      />
      <KpiTile
        title="Em risco"
        value={
          data.kpis.negociosEmRisco != null
            ? String(data.kpis.negociosEmRisco)
            : "—"
        }
      />
      <KpiTile title="Pipeline" value={moneyOrDash(data.kpis.valorPipeline)} />
      <KpiTile title="Ticket médio" value={moneyOrDash(data.kpis.ticketMedio)} />
    </View>
  );
}

export function CrmDecisionBrief({ lines }: { lines: string[] }) {
  const { colors } = useTheme();
  if (!lines.length) return null;
  return (
    <Card>
      <Text variant="subtitle">Decision Brief</Text>
      {lines.map((l, idx) => (
        <Text
          key={`${idx}-${l.slice(0, 24)}`}
          variant="body"
          style={{ color: colors.textMuted, marginTop: 6 }}
        >
          • {l}
        </Text>
      ))}
    </Card>
  );
}

export function CrmAlerts({
  alerts,
}: {
  alerts: MobileCrmDashboard["alerts"];
}) {
  const { colors } = useTheme();
  if (!alerts.length) {
    return (
      <Card>
        <Text variant="subtitle">Alertas</Text>
        <Text variant="body" style={{ color: colors.textMuted, marginTop: 6 }}>
          Nenhum alerta comercial no momento.
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

export function CrmQuickActions({
  actions,
  onPress,
}: {
  actions: MobileCrmDashboard["quickActions"];
  onPress: (action: MobileCrmDashboard["quickActions"][number]) => void;
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

export function CrmPipelineBoard({ data }: { data: MobileCrmPipeline }) {
  const { colors } = useTheme();
  if (data.unavailable || !data.columns.length) {
    return (
      <Card style={{ marginHorizontal: 16 }}>
        <Text variant="body" style={{ color: colors.textMuted }}>
          Pipeline indisponível ou vazio.
        </Text>
      </Card>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 16 }}
    >
      {data.columns.map((col) => (
        <Card key={col.stage} style={styles.column}>
          <Text variant="subtitle">{col.label}</Text>
          <Text variant="caption" style={{ color: colors.textMuted }}>
            {col.count} · {col.totalValor}
          </Text>
          {col.cards.slice(0, 12).map((card) => (
            <View
              key={card.id}
              style={[styles.cardItem, { borderColor: colors.border }]}
            >
              <Text variant="body">{card.nome}</Text>
              <Text variant="caption" style={{ color: colors.textMuted }}>
                {card.valor ?? "—"}
                {card.score != null ? ` · score ${card.score}` : ""}
              </Text>
            </View>
          ))}
        </Card>
      ))}
    </ScrollView>
  );
}

export function CrmSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      style={{ gap: 12, padding: 16 }}
      accessibilityLabel="Carregando CRM"
    >
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

/** Mensagem amigável para 401/403 sem expor detalhes internos. */
export function crmErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const status = (err as Error & { status?: number }).status;
  if (status === 401) return "Sessão expirada. Faça login novamente.";
  if (status === 403) return "Sem permissão de CRM neste tenant.";
  return err.message || fallback;
}

export function throwCrmApiError(result: {
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
  column: { width: 240, marginHorizontal: 8, marginVertical: 8 },
  cardItem: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
});
