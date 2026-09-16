import { deleteAccount } from "@/api/mobile-api";
import { useSessionStore } from "@/auth/session-store";
import {
  Alert,
  Button,
  Card,
  Input,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

const PALAVRA_CONFIRMACAO = "EXCLUIR";

export default function ExcluirContaScreen() {
  const logout = useSessionStore((s) => s.logout);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const podeExcluir = confirmText.trim().toUpperCase() === PALAVRA_CONFIRMACAO;

  async function handleExcluir() {
    if (!podeExcluir || loading) return;
    setLoading(true);
    setError(null);

    const result = await deleteAccount();
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    // Conta já foi apagada no servidor — só limpa a sessão local e sai.
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Alert
          tone="danger"
          title="Excluir sua conta é permanente"
          message="Seu login, seu perfil e o acesso a todas as empresas das quais você é membro serão apagados. Essa ação não pode ser desfeita."
        />

        <Card style={styles.card}>
          <Text variant="subtitle">O que acontece:</Text>
          <Text variant="body" muted>
            • Seu login e senha deixam de funcionar{"\n"}
            • Você sai automaticamente de todas as empresas das quais é
            membro{"\n"}
            • Se você é o único proprietário de alguma empresa, não será
            possível excluir a conta até promover outra pessoa a proprietário
            ou excluir a empresa
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text variant="body">
            Pra confirmar, digite{" "}
            <Text variant="body" style={styles.palavra}>
              {PALAVRA_CONFIRMACAO}
            </Text>{" "}
            abaixo:
          </Text>
          <Input
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={PALAVRA_CONFIRMACAO}
          />
        </Card>

        {error ? <Alert tone="danger" title="Não foi possível excluir" message={error} /> : null}

        <View style={{ gap: 8 }}>
          <Button
            title={loading ? "Excluindo…" : "Excluir minha conta"}
            variant="primary"
            onPress={handleExcluir}
            disabled={!podeExcluir || loading}
          />
          <Button
            title="Cancelar"
            variant="ghost"
            onPress={() => router.back()}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  card: { gap: 8 },
  palavra: { fontWeight: "700" },
});
