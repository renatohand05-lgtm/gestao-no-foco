import { Button, ErrorState, SafeAreaScreen } from "@/design/components";
import { router } from "expo-router";

export default function AccessDeniedScreen() {
  return (
    <SafeAreaScreen>
      <ErrorState
        title="Acesso negado"
        message="Você não tem permissão para acessar este recurso."
        action={<Button title="Voltar ao login" onPress={() => router.replace("/(auth)/login")} />}
      />
    </SafeAreaScreen>
  );
}
