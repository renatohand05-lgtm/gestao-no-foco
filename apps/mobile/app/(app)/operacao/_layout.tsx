import { Stack } from "expo-router";
import { useTheme } from "@/design/theme";

export default function OperacaoLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Operação" }} />
      <Stack.Screen name="ordens" options={{ title: "Ordens" }} />
      <Stack.Screen name="ordens/[id]" options={{ title: "Ordem" }} />
      <Stack.Screen name="agenda" options={{ title: "Agenda" }} />
      <Stack.Screen name="equipe" options={{ title: "Equipe" }} />
      <Stack.Screen name="veiculos" options={{ title: "Veículos" }} />
      <Stack.Screen name="veiculos/[id]" options={{ title: "Veículo" }} />
      <Stack.Screen name="clientes" options={{ title: "Clientes" }} />
      <Stack.Screen name="clientes/[id]" options={{ title: "Cliente" }} />
      <Stack.Screen name="notificacoes" options={{ title: "Alertas" }} />
    </Stack>
  );
}
