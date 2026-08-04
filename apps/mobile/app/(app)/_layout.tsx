import { Tabs } from "expo-router";
import { useTheme } from "@/design/theme";

export default function AppLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.primary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Início", tabBarLabel: "Início" }} />
      <Tabs.Screen name="crm" options={{ title: "CRM", tabBarLabel: "CRM", headerShown: false }} />
      <Tabs.Screen name="estoque" options={{ title: "Estoque", tabBarLabel: "Estoque", headerShown: false }} />
      <Tabs.Screen name="operacao" options={{ title: "Operação", tabBarLabel: "Operação", headerShown: false }} />
      <Tabs.Screen name="financeiro" options={{ title: "Financeiro", tabBarLabel: "Financeiro", headerShown: false }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil", tabBarLabel: "Perfil" }} />
      <Tabs.Screen name="settings" options={{ title: "Ajustes", tabBarLabel: "Ajustes" }} />
    </Tabs>
  );
}
