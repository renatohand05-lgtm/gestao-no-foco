import { Stack } from "expo-router";
import { useTheme } from "@/design/theme";

export default function FinanceLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Financeiro" }} />
      <Stack.Screen name="contas-pagar" options={{ title: "Contas a pagar" }} />
      <Stack.Screen name="contas-receber" options={{ title: "Contas a receber" }} />
      <Stack.Screen name="fluxo-caixa" options={{ title: "Fluxo de caixa" }} />
      <Stack.Screen name="dre" options={{ title: "DRE" }} />
      <Stack.Screen name="aprovacoes" options={{ title: "Aprovações" }} />
      <Stack.Screen name="detalhe/[id]" options={{ title: "Detalhe" }} />
    </Stack>
  );
}
