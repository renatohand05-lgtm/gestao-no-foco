import { Stack } from "expo-router";
import { useTheme } from "@/design/theme";

export default function EstoqueLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Estoque" }} />
      <Stack.Screen name="produtos" options={{ title: "Produtos" }} />
      <Stack.Screen name="produto/[id]" options={{ title: "Produto" }} />
      <Stack.Screen name="movimentacoes" options={{ title: "Movimentações" }} />
      <Stack.Screen name="inventario" options={{ title: "Inventário" }} />
      <Stack.Screen name="compras" options={{ title: "Compras" }} />
      <Stack.Screen name="compra/[id]" options={{ title: "Pedido" }} />
      <Stack.Screen name="fornecedores" options={{ title: "Fornecedores" }} />
      <Stack.Screen name="alertas" options={{ title: "Alertas" }} />
    </Stack>
  );
}
