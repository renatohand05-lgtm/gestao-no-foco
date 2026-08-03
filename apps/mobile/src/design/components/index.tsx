import { useTheme } from "@/design/theme";
import { useHasPermission } from "@/permissions/gate";
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
        ? colors.primary
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
});
