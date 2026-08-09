import React, { Component, type ErrorInfo, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";

import { resolveBootRoute } from "@/auth/guards";
import { messageForAuthFailure } from "@/auth/recovery-policy";
import { useSessionStore } from "@/auth/session-store";
import { logger } from "@/observability/logger";
import { mobileTelemetry } from "@/observability/telemetry";
import { router } from "expo-router";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  errorCode: string;
};

function RecoveryActions({ errorCode }: { errorCode: string }) {
  const boot = useSessionStore((s) => s.boot);
  const returnToLogin = useSessionStore((s) => s.returnToLogin);
  const [busy, setBusy] = React.useState(false);

  return (
    <View style={styles.actions}>
      <Pressable
        style={[styles.btn, styles.btnPrimary]}
        disabled={busy}
        onPress={() => {
          if (busy) return;
          setBusy(true);
          void boot({ mode: "manual" })
            .catch(() => undefined)
            .finally(() => {
              setBusy(false);
              try {
                router.replace("/");
              } catch {
                /* ignore */
              }
            });
        }}
      >
        {busy ? (
          <ActivityIndicator color="#05070A" />
        ) : (
          <Text style={styles.btnPrimaryText}>Tentar novamente</Text>
        )}
      </Pressable>
      <Pressable
        style={[styles.btn, styles.btnSecondary]}
        disabled={busy}
        onPress={() => {
          if (busy) return;
          setBusy(true);
          void returnToLogin(
            "error_boundary",
            messageForAuthFailure("unexpected"),
          )
            .catch(() => undefined)
            .finally(() => {
              setBusy(false);
              try {
                router.replace(resolveBootRoute("unauthenticated"));
              } catch {
                /* ignore */
              }
            });
        }}
      >
        <Text style={styles.btnSecondaryText}>Voltar para o login</Text>
      </Pressable>
      <Text style={styles.code}>Código: {errorCode}</Text>
    </View>
  );
}

/**
 * Impede encerramento silencioso do processo por erro de render.
 * UI sem ThemeProvider (plain RN) para não re-crashar.
 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorCode: "E_UNKNOWN" };

  static getDerivedStateFromError(error: Error): State {
    const name = error?.name || "Error";
    return {
      hasError: true,
      errorCode: `E_${name}`.slice(0, 32),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error("app.error_boundary", {
      name: error?.name,
      message: error?.message?.slice(0, 120),
      componentStack: info.componentStack?.slice(0, 200),
    });
    mobileTelemetry.track("UNHANDLED_ERROR", {
      reason: error?.name?.slice(0, 40) ?? "Error",
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container} accessibilityRole="alert">
          <Text style={styles.title}>O aplicativo encontrou um erro</Text>
          <Text style={styles.message}>
            Você pode tentar novamente ou voltar para o login com segurança.
          </Text>
          <RecoveryActions errorCode={this.state.errorCode} />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#0B0F14",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  message: {
    color: "#A3AAB5",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  actions: { gap: 12, marginTop: 8 },
  btn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: "#C9A84C" },
  btnPrimaryText: { color: "#05070A", fontWeight: "700", fontSize: 16 },
  btnSecondary: {
    backgroundColor: "#1A222D",
    borderWidth: 1,
    borderColor: "#2A3441",
  },
  btnSecondaryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
  code: { textAlign: "center", marginTop: 8, color: "#6B7280", fontSize: 12 },
});
