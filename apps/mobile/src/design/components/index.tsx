import { useTheme } from "@/design/theme";
import { useHasPermission } from "@/permissions/gate";
import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type ViewProps,
} from "react-native";
import { SafeAreaView, type SafeAreaViewProps } from "react-native-safe-area-context";
import { Text } from "./Text";

export function Screen({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
      {...props}
    />
  );
}


export function SafeAreaScreen({ style, ...props }: SafeAreaViewProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
      {...props}
    />
  );
}

export { Text };

type ButtonProps = Omit<PressableProps, "style"> & {
  title: string;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  style?: ViewProps["style"];
};

export function Button({
  title,
  variant = "primary",
  loading,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "secondary"
        ? colors.surface
        : "transparent";
  const fg = variant === "primary" ? "#05070A" : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text variant="subtitle" style={{ color: fg, textAlign: "center" }}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function IconButton({
  children,
  style,
  ...props
}: Omit<PressableProps, "style"> & { style?: ViewProps["style"] }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.iconButton,
        { borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
        style,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={[
        styles.input,
        { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
        props.style,
      ]}
      {...props}
    />
  );
}

export function PasswordInput(props: TextInputProps) {
  return <Input secureTextEntry autoCapitalize="none" {...props} />;
}

export function Card({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
      {...props}
    />
  );
}

type BadgeProps = ViewProps & { label: string; tone?: "default" | "success" | "warning" | "danger" };

export function Badge({ label, tone = "default", style, ...props }: BadgeProps) {
  const { colors } = useTheme();
  const toneColor =
    tone === "success"
      ? colors.success
      : tone === "warning"
        ? colors.warning
        : tone === "danger"
          ? colors.danger
          : colors.primary;
  return (
    <View style={[styles.badge, { borderColor: toneColor }, style]} {...props}>
      <Text variant="caption" style={{ color: toneColor }}>
        {label}
      </Text>
    </View>
  );
}

type AlertProps = ViewProps & { title: string; message?: string; tone?: "info" | "danger" };

export function Alert({ title, message, tone = "info", style, ...props }: AlertProps) {
  const { colors } = useTheme();
  const border = tone === "danger" ? colors.danger : colors.primary;
  return (
    <View style={[styles.alert, { borderColor: border }, style]} {...props}>
      <Text variant="subtitle">{title}</Text>
      {message ? (
        <Text variant="body" muted style={{ marginTop: 4 }}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

export type Severity = "critical" | "warning" | "success" | "info";

const SEVERITY_ICON: Record<Severity, keyof typeof Feather.glyphMap> = {
  critical: "alert-triangle",
  warning: "clock",
  success: "check-circle",
  info: "info",
};

/** Ícone dentro de um círculo colorido — usado em listas (alertas, empresas). */
export function IconCircle({
  name,
  tone = "info",
  size = 34,
}: {
  name: keyof typeof Feather.glyphMap;
  tone?: Severity;
  size?: number;
}) {
  const { colors } = useTheme();
  const color =
    tone === "critical"
      ? colors.danger
      : tone === "warning"
        ? colors.warning
        : tone === "success"
          ? colors.success
          : colors.primary;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: `${color}22`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Feather name={name} size={size * 0.48} color={color} />
    </View>
  );
}

type SeverityCardProps = {
  title: string;
  subtitle?: string;
  tone?: Severity;
  icon?: keyof typeof Feather.glyphMap;
  onPress?: () => void;
};

/** Card de alerta/decisão com borda colorida à esquerda + ícone — substitui listas de texto cru. */
export function SeverityCard({ title, subtitle, tone = "info", icon, onPress }: SeverityCardProps) {
  const { colors } = useTheme();
  const accent =
    tone === "critical"
      ? colors.danger
      : tone === "warning"
        ? colors.warning
        : tone === "success"
          ? colors.success
          : colors.primary;
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean } = {}) => [
        styles.severityCard,
        {
          backgroundColor: colors.surfaceElevated,
          borderLeftColor: accent,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Feather
        name={icon ?? SEVERITY_ICON[tone]}
        size={16}
        color={accent}
        style={{ marginTop: 2 }}
      />
      <View style={{ flex: 1 }}>
        <Text variant="body" style={{ fontWeight: "500" }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" muted style={{ marginTop: 2 }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Wrapper>
  );
}

type KpiCardProps = {
  label: string;
  value: string;
  /** Positivo = verde, negativo = vermelho, indefinido = cor padrão. */
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  supportingText?: string;
  unavailable?: boolean;
};

/** KPI com cor de status real (verde/vermelho), não texto branco genérico. */
export function KpiCard({ label, value, trend, trendLabel, supportingText, unavailable }: KpiCardProps) {
  const { colors } = useTheme();
  const trendColor =
    trend === "up" ? colors.success : trend === "down" ? colors.danger : colors.textMuted;
  return (
    <Card style={styles.kpiCard}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text variant="title" style={{ color: unavailable ? colors.textMuted : colors.text }}>
        {value}
      </Text>
      {trendLabel ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {trend && trend !== "neutral" ? (
            <Feather
              name={trend === "up" ? "trending-up" : "trending-down"}
              size={12}
              color={trendColor}
            />
          ) : null}
          <Text variant="caption" style={{ color: trend ? trendColor : colors.textMuted }}>
            {trendLabel}
          </Text>
        </View>
      ) : supportingText ? (
        <Text variant="caption" muted numberOfLines={2}>
          {supportingText}
        </Text>
      ) : null}
    </Card>
  );
}

/** Gráfico de barras simples — sem dependência nova, só Views proporcionais. */
export function MiniBarChart({
  data,
  labels,
  highlightLast = true,
}: {
  data: number[];
  labels?: string[];
  highlightLast?: boolean;
}) {
  const { colors } = useTheme();
  const max = Math.max(...data, 1);
  return (
    <View>
      <View style={styles.chartRow}>
        {data.map((v, i) => {
          const isLast = i === data.length - 1;
          const heightPct = Math.max((v / max) * 100, 4);
          return (
            <View key={i} style={styles.chartBarTrack}>
              <View
                style={[
                  styles.chartBar,
                  {
                    height: `${heightPct}%`,
                    backgroundColor:
                      isLast && highlightLast ? colors.primary : colors.border,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      {labels ? (
        <View style={styles.chartRow}>
          {labels.map((l, i) => (
            <Text
              key={i}
              variant="caption"
              muted={!(highlightLast && i === labels.length - 1)}
              style={[
                styles.chartLabel,
                highlightLast && i === labels.length - 1
                  ? { color: colors.primary }
                  : null,
              ]}
            >
              {l}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function Skeleton({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.skeleton, { backgroundColor: colors.border }, style]}
      {...props}
    />
  );
}

type StateProps = { title: string; message?: string; action?: React.ReactNode };

export function EmptyState({ title, message, action }: StateProps) {
  return (
    <View style={styles.state}>
      <Text variant="title">{title}</Text>
      {message ? (
        <Text variant="body" muted style={styles.stateMessage}>
          {message}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

export function ErrorState({ title, message, action }: StateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.state}>
      <Text variant="title" style={{ color: colors.danger }}>
        {title}
      </Text>
      {message ? (
        <Text variant="body" muted style={styles.stateMessage}>
          {message}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

export function LoadingState({ title = "Carregando…" }: { title?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.primary} />
      <Text variant="body" muted style={{ marginTop: 12 }}>
        {title}
      </Text>
    </View>
  );
}

export function Divider({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return <View style={[{ height: 1, backgroundColor: colors.border }, style]} {...props} />;
}

type ListItemProps = Omit<PressableProps, "style"> & {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  style?: ViewProps["style"];
};

export function ListItem({ title, subtitle, trailing, style, ...props }: ListItemProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.listItem,
        { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
      {...props}
    >
      <View style={{ flex: 1 }}>
        <Text variant="subtitle">{title}</Text>
        {subtitle ? (
          <Text variant="caption" muted>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}

export function Avatar({ label, size = 40 }: { label: string; size?: number }) {
  const { colors } = useTheme();
  const initials = label.slice(0, 2).toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text variant="caption" style={{ color: "#05070A", fontWeight: "700" }}>
        {initials}
      </Text>
    </View>
  );
}

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const allowed = useHasPermission(permission);
  return allowed ? <>{children}</> : <>{fallback}</>;
}

export function KpiPlaceholder({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.kpi}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text variant="title" style={{ marginTop: 8, color: colors.textMuted }}>
        —
      </Text>
      <Text variant="caption" muted style={{ marginTop: 4 }}>
        Disponível em versão futura
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderWidth: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  alert: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  skeleton: {
    borderRadius: 8,
    height: 16,
  },
  state: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  stateMessage: {
    marginTop: 8,
    textAlign: "center",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  kpi: {
    minWidth: 140,
    flex: 1,
  },
  severityCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  kpiCard: {
    width: "47%",
    flexGrow: 1,
    gap: 4,
  },
  chartRow: {
    flexDirection: "row",
    gap: 6,
  },
  chartBarTrack: {
    flex: 1,
    height: 64,
    justifyContent: "flex-end",
  },
  chartBar: {
    borderRadius: 4,
    minHeight: 3,
  },
  chartLabel: {
    flex: 1,
    textAlign: "center",
  },
});
