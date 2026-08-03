import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, title: "Gestão" }}>
      <Stack.Screen name="login" options={{ title: "Entrar" }} />
      <Stack.Screen name="recover" options={{ title: "Recuperar senha" }} />
      <Stack.Screen name="reset" options={{ title: "Nova senha", headerShown: false }} />
      <Stack.Screen name="biometric-setup" options={{ title: "Biometria", headerShown: false }} />
      <Stack.Screen name="tenant" options={{ title: "Empresa" }} />
      <Stack.Screen name="branch" options={{ title: "Filial" }} />
    </Stack>
  );
}
