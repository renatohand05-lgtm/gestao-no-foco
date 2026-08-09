import {
  getBiometricLabel,
  isBiometricAvailable,
  loadBiometricPref,
  setBiometricPref,
} from "@/auth/biometrics";
import { useSessionStore } from "@/auth/session-store";
import {
  Button,
  Card,
  ListItem,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { useTheme } from "@/design/theme";
import { getAppEnv } from "@/env/validate";
import Constants from "expo-constants";
import * as Application from "expo-application";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, View } from "react-native";

export default function SettingsScreen() {
  const { resolved, preference, toggle, setPreference } = useTheme();
  const logout = useSessionStore((s) => s.logout);
  const appEnv = getAppEnv();
  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "1.0.0";
  const build = Application.nativeBuildVersion ?? "—";

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometria");

  useEffect(() => {
    void (async () => {
      setBiometricEnabled(await loadBiometricPref());
      setBiometricAvailable(await isBiometricAvailable());
      setBiometricLabel(await getBiometricLabel());
    })();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const handleBiometricToggle = async (value: boolean) => {
    setBiometricEnabled(value);
    await setBiometricPref(value);
  };

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text variant="subtitle">Segurança</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text variant="body">{biometricLabel}</Text>
              <Text variant="caption" muted>
                {biometricAvailable
                  ? "Desbloqueio local sem armazenar senha"
                  : "Indisponível neste dispositivo"}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={!biometricAvailable}
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text variant="subtitle">Aparência</Text>
          <Text variant="body" muted>
            Tema atual: {resolved} ({preference})
          </Text>
          <Button title="Alternar claro/escuro" variant="secondary" onPress={toggle} />
          <Button
            title="Usar tema do sistema"
            variant="ghost"
            onPress={() => setPreference("system")}
          />
        </Card>

        <Card style={styles.card}>
          <Text variant="subtitle">Sobre</Text>
          <ListItem title="Versão" trailing={<Text variant="body">{version}</Text>} />
          <ListItem
            title="Build"
            trailing={<Text variant="body">{build}</Text>}
          />
          <Text variant="caption" muted>
            Build number do binário (EAS remote). Ambiente: {appEnv}. Integrity:{" "}
            {String(
              (Constants.expoConfig?.extra as { startupIntegrity?: string } | undefined)
                ?.startupIntegrity ?? "—",
            )}
            .
          </Text>
          <ListItem title="Ambiente" trailing={<Text variant="body">{appEnv}</Text>} />
        </Card>

        <Button title="Sair" variant="secondary" onPress={handleLogout} />
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  card: { gap: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
