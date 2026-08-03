import {
  getBiometricLabel,
  isBiometricAvailable,
  setBiometricPref,
} from "@/auth/biometrics";
import { Button, SafeAreaScreen, Text } from "@/design/components";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

export default function BiometricSetupScreen() {
  const [label, setLabel] = useState("Biometria");
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      setAvailable(await isBiometricAvailable());
      setLabel(await getBiometricLabel());
    })();
  }, []);

  const skip = () => router.replace("/(auth)/tenant");

  const enable = async () => {
    setLoading(true);
    try {
      await setBiometricPref(true);
    } finally {
      setLoading(false);
      skip();
    }
  };

  return (
    <SafeAreaScreen>
      <View style={styles.content}>
        <Text variant="title">Desbloqueio rápido</Text>
        <Text variant="body" muted style={styles.subtitle}>
          {available
            ? `Ative ${label} para desbloquear o app sem digitar senha. Sua senha nunca é armazenada no dispositivo.`
            : "Biometria não disponível neste dispositivo. Você pode ativar depois em Configurações."}
        </Text>

        {available ? (
          <>
            <Button title={`Ativar ${label}`} loading={loading} onPress={enable} />
            <Button title="Agora não" variant="ghost" onPress={skip} />
          </>
        ) : (
          <Button title="Continuar" onPress={skip} />
        )}
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 16 },
  subtitle: { marginBottom: 8 },
});
